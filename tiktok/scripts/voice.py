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
"""
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


def main(video_id):
    vdir = ROOT / "src" / "videos" / video_id
    script = json.loads((vdir / "script.json").read_text())
    use_eleven = bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID"))
    print(f"voice: {'ElevenLabs' if use_eleven else 'macOS say / ' + script['voice']}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        # pass 1: speak every line
        spoken_wavs, durs = [], []
        for i, line in enumerate(script["lines"]):
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
            lines[line["id"]] = {
                "text": line["text"], "start": round(t, 3), "end": round(t + d, 3),
                "words": word_times(line["text"], t, t + d),
            }
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
    if len(sys.argv) != 2:
        sys.exit("usage: python3 scripts/voice.py <video-id>")
    main(sys.argv[1])
