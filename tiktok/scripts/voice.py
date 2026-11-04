"""Generate the voice-over and its timing for one video.

    python3 scripts/voice.py hz240

Reads src/videos/<id>/script.json, speaks every line, joins them with short
pauses and writes
    public/<id>/voice.wav            the voice track
    src/videos/<id>/timing.json      start/end of every line and word (seconds)

Voice: macOS `say` by default (free, offline). With ELEVENLABS_API_KEY and
ELEVENLABS_VOICE_ID set in the environment, ElevenLabs is used instead.
Word times are spread over each line by word length, which is close enough
for 2-3 word captions.

From a finished recording (e.g. the whole script read in one go in the ElevenLabs app):

    python3 scripts/voice.py sonne --recording adrian.mp3 --words adrian_words.json

The recording is cut into the script lines using word timestamps (a JSON list of
{"w", "start", "end"}, e.g. from faster-whisper), then joined exactly like above;
word times come from the recording itself.

Add --keep to use such a recording in one piece instead (no cutting, no inserted pauses):
the take keeps its own natural flow, only the word onsets are sharpened from the audio.
Use it for takes that already flow well; cutting them apart makes the joins sound choppy.
"""
import array
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RATE = 48000
LEAD_IN = 0.35      # silence before the first line
DEFAULT_PAUSE = 0.18


def run(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(out.strip())


def speak_say(text, voice, rate, out):
    aiff = out.with_suffix(".aiff")
    # `say` occasionally hangs; give it a few tries
    for attempt in range(3):
        try:
            subprocess.run(["say", "-v", voice, "-r", str(rate), "-o", str(aiff), text],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=30)
            return aiff
        except subprocess.TimeoutExpired:
            print(f"  say timed out, retry {attempt + 1}")
    sys.exit(f"say kept hanging on: {text}")


def speak_elevenlabs(text, out):
    voice_id = os.environ["ELEVENLABS_VOICE_ID"]
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
    )
    mp3 = out.with_suffix(".mp3")
    with urllib.request.urlopen(req) as resp:
        mp3.write_bytes(resp.read())
    return mp3


def to_trimmed_wav(src, dst):
    # mono 48 kHz, leading and trailing silence cut so line times are tight
    trim = "silenceremove=start_periods=1:start_threshold=-50dB"
    run("ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ar", str(RATE),
        "-af", f"{trim},areverse,{trim},areverse", str(dst))


def word_times(text, start, end):
    words = text.split()
    weights = [len(re.sub(r"[^\wäöüÄÖÜß]", "", w)) + 2 for w in words]
    total = sum(weights)
    t, out = start, []
    for w, k in zip(words, weights):
        d = (end - start) * k / total
        out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return out


def norm(w):
    return re.sub(r"[^0-9a-zäöüß]", "", w.lower())


def align_recording(script, words):
    """For every script line: (start, end) in the recording plus the times of its spoken words."""
    spoken = [line.get("speak", line["text"]).split() for line in script["lines"]]
    flat = [(i, j, norm(w)) for i, ws in enumerate(spoken) for j, w in enumerate(ws)]
    rec = [norm(w["w"]) for w in words]
    match = {}
    sm = difflib.SequenceMatcher(None, [x[2] for x in flat], rec, autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            match[a + k] = b + k
    # times for every script word; unmatched words are interpolated between matched neighbours
    times = [None] * len(flat)
    for k, r in match.items():
        times[k] = (words[r]["start"], words[r]["end"])
    known = [k for k in range(len(flat)) if times[k]]
    for k in range(len(flat)):
        if times[k]:
            continue
        lo = max([q for q in known if q < k], default=None)
        hi = min([q for q in known if q > k], default=None)
        a = times[lo][1] if lo is not None else 0.0
        b = times[hi][0] if hi is not None else words[-1]["end"]
        n0 = lo if lo is not None else -1
        n1 = hi if hi is not None else len(flat)
        f0 = (k - n0) / (n1 - n0)
        f1 = (k + 1 - n0) / (n1 - n0)
        times[k] = (a + (b - a) * f0, a + (b - a) * f1)
    print(f"  aligned {len(match)}/{len(flat)} script words to the recording")
    per_line = [[] for _ in spoken]
    for (i, j, _), t in zip(flat, times):
        per_line[i].append(t)
    return per_line


def envelope(path, hop=0.01):
    """RMS level every `hop` seconds (mono, RATE)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    a = array.array("h")
    a.frombytes(raw[: len(raw) // 2 * 2])
    n = int(RATE * hop)
    return [(sum(x * x for x in a[i:i + n]) / n) ** 0.5 for i in range(0, len(a) - n, n)]


def sharpen_onsets(times, env, hop=0.01):
    """Whisper glues pauses onto the next word (its start = previous end). Move each start to
    where the sound really begins: the first rise after the quietest point early in the word."""
    out = list(times)
    for k in range(1, len(out)):
        s, e = out[k]
        a, b = int(s / hop), int(min(e - 0.08, s + 0.6) / hop)
        if b - a < 3 or b >= len(env):
            continue
        peak = max(env[a:int(e / hop) + 1] or [0])
        lo = min(range(a, b), key=lambda i: env[i])
        if peak <= 0 or env[lo] > 0.15 * peak:
            continue  # no real pause inside, keep whisper's start
        on = next((i for i in range(lo, int(e / hop)) if env[i] > 0.25 * peak), lo)
        out[k] = (max(s, on * hop - 0.03), e)
    return out


def main_keep(video_id, recording, words_json):
    vdir = ROOT / "src" / "videos" / video_id
    script = json.loads((vdir / "script.json").read_text())
    print(f"voice: recording {recording} (kept in one piece)")
    words = json.loads(Path(words_json).read_text())
    per_line = align_recording(script, words)
    env = envelope(recording)
    flat = sharpen_onsets([t for line in per_line for t in line], env)
    k = 0
    for i, line in enumerate(per_line):
        per_line[i] = flat[k:k + len(line)]
        k += len(line)
    rec_len = duration(recording)
    head = max(0.0, per_line[0][0][0] - 0.12)
    tail = min(rec_len, per_line[-1][-1][1] + 0.8)
    off = LEAD_IN - head
    out_dir = ROOT / "public" / video_id
    out_dir.mkdir(parents=True, exist_ok=True)
    run("ffmpeg", "-y", "-ss", f"{head:.3f}", "-to", f"{tail:.3f}", "-i", str(recording),
        "-af", f"adelay={int(LEAD_IN * 1000)},afade=t=out:st={LEAD_IN + tail - head - 0.3:.3f}:d=0.3,loudnorm=I=-16:TP=-1.5",
        "-ac", "1", "-ar", str(RATE), str(out_dir / "voice.wav"))
    lines = {}
    for line, ts in zip(script["lines"], per_line):
        text_words = line["text"].split()
        start, end = ts[0][0] + off, ts[-1][1] + off
        if len(ts) == len(text_words):
            wt = [{"w": w, "start": round(a + off, 3), "end": round(b + off, 3)} for w, (a, b) in zip(text_words, ts)]
        else:
            wt = word_times(line["text"], start, end)
        lines[line["id"]] = {"text": line["text"], "start": round(start, 3), "end": round(end, 3), "words": wt}
        print(f"  {line['id']:8s} {start:6.2f}s  {line['text']}")
    total = LEAD_IN + tail - head
    (vdir / "timing.json").write_text(json.dumps({"duration": round(total, 3), "lines": lines}, ensure_ascii=False, indent=1))
    print(f"total {total:.1f}s -> public/{video_id}/voice.wav, src/videos/{video_id}/timing.json")


def main(video_id, recording=None, words_json=None):
    vdir = ROOT / "src" / "videos" / video_id
    script = json.loads((vdir / "script.json").read_text())
    use_eleven = bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID"))
    print(f"voice: {'recording ' + str(recording) if recording else 'ElevenLabs' if use_eleven else 'macOS say / ' + script['voice']}")
    rec_words = None

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        # pass 1: speak every line (or cut it out of the recording)
        spoken_wavs, durs = [], []
        if recording:
            words = json.loads(Path(words_json).read_text())
            per_line = align_recording(script, words)
            n = len(per_line)
            cuts = [max(0.0, per_line[0][0][0] - 0.15)]
            for i in range(n - 1):
                cuts.append((per_line[i][-1][1] + per_line[i + 1][0][0]) / 2)
            cuts.append(per_line[-1][-1][1] + 0.6)
            rec_words = []
            for i in range(n):
                base = tmp / f"l{i:03d}"
                raw = base.with_suffix(".cut.wav")
                run("ffmpeg", "-y", "-ss", f"{cuts[i]:.3f}", "-to", f"{cuts[i + 1]:.3f}", "-i", str(recording), "-ac", "1", "-ar", str(RATE), str(raw))
                wav = base.with_suffix(".wav")
                to_trimmed_wav(raw, wav)
                spoken_wavs.append(wav)
                durs.append(duration(wav))
                # word times relative to the trimmed clip (trim removed the silence before the first word)
                first = per_line[i][0][0]
                rec_words.append([(a - first, b - first) for a, b in per_line[i]])
        for i, line in enumerate([] if recording else script["lines"]):
            spoken = line.get("speak", line["text"])
            base = tmp / f"l{i:03d}"
            raw = speak_elevenlabs(spoken, base) if use_eleven else speak_say(spoken, script["voice"], line.get("rate", script["rate"]), base)
            wav = base.with_suffix(".wav")
            to_trimmed_wav(raw, wav)
            spoken_wavs.append(wav)
            durs.append(duration(wav))
        pauses = [line.get("pause", DEFAULT_PAUSE) for line in script["lines"]]

        # a line with "end_at" must finish at that second: the pauses before it are stretched evenly
        for k, line in enumerate(script["lines"]):
            if "end_at" not in line:
                continue
            natural = LEAD_IN + sum(durs[: k + 1]) + sum(pauses[:k])
            extra = line["end_at"] - natural
            if extra < 0:
                print(f"  warning: {line['id']} ends at {natural:.1f}s, {-extra:.1f}s after its end_at")
                continue
            total_pause = sum(pauses[:k])
            pauses[:k] = [p + extra * p / total_pause for p in pauses[:k]]
            print(f"  {line['id']}: pauses before it stretched by {extra:.1f}s in total")

        # pass 2: join with the (stretched) pauses
        parts, lines, t = [], {}, 0.0
        silence = tmp / "lead.wav"
        run("ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={RATE}:cl=mono", "-t", str(LEAD_IN), str(silence))
        parts.append(silence)
        t += LEAD_IN
        for i, line in enumerate(script["lines"]):
            d = durs[i]
            text_words = line["text"].split()
            if rec_words and len(rec_words[i]) == len(text_words):
                wt = [{"w": w, "start": round(t + max(0.0, a), 3), "end": round(t + min(d, b), 3)} for w, (a, b) in zip(text_words, rec_words[i])]
            else:
                wt = word_times(line["text"], t, t + d)
            lines[line["id"]] = {"text": line["text"], "start": round(t, 3), "end": round(t + d, 3), "words": wt}
            parts.append(spoken_wavs[i])
            t += d
            gap = tmp / f"g{i:03d}.wav"
            run("ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={RATE}:cl=mono", "-t", f"{pauses[i]:.3f}", str(gap))
            parts.append(gap)
            t += pauses[i]
            print(f"  {line['id']:8s} {lines[line['id']]['start']:6.2f}s  {line['text']}")

        listfile = tmp / "list.txt"
        listfile.write_text("".join(f"file '{p}'\n" for p in parts))
        out_dir = ROOT / "public" / video_id
        out_dir.mkdir(parents=True, exist_ok=True)
        run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
            "-af", "loudnorm=I=-16:TP=-1.5", "-ar", str(RATE), str(out_dir / "voice.wav"))

    timing = {"duration": round(t, 3), "lines": lines}
    (vdir / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1))
    print(f"total {t:.1f}s -> public/{video_id}/voice.wav, src/videos/{video_id}/timing.json")


if __name__ == "__main__":
    args = sys.argv[1:]
    keep = "--keep" in args
    args = [a for a in args if a != "--keep"]
    opts = {}
    while len(args) >= 3 and args[-2] in ("--recording", "--words"):
        opts[args[-2][2:]] = Path(args[-1]).resolve()
        args = args[:-2]
    if len(args) != 1 or (("recording" in opts) != ("words" in opts)):
        sys.exit("usage: python3 scripts/voice.py <video-id> [--recording file --words words.json [--keep]]")
    if keep:
        if "recording" not in opts:
            sys.exit("--keep needs --recording and --words")
        main_keep(args[0], opts["recording"], opts["words"])
    else:
        main(args[0], opts.get("recording"), opts.get("words"))
