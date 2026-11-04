"""Synthesize the sound effects for a video with ffmpeg (no downloads, no credits).

    python3 scripts/sfx.py sonne

Writes public/<id>/sfx/*.wav: whoosh, whoosh_soft, boom, tick, blip, wind (loop), underwater (loop).
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RATE = 48000

SFX = {
    # fast whip pan: bright noise swelling and falling off
    "whoosh": ("anoisesrc=color=pink:d=0.7:a=0.9", "highpass=f=500,lowpass=f=5000,afade=t=in:d=0.32:curve=exp,afade=t=out:st=0.32:d=0.38:curve=log,aecho=0.6:0.4:30:0.25"),
    # zoom / iris: darker, longer air movement
    "whoosh_soft": ("anoisesrc=color=pink:d=1.0:a=0.8", "highpass=f=150,lowpass=f=1600,afade=t=in:d=0.5:curve=exp,afade=t=out:st=0.5:d=0.5,volume=0.8"),
    # deep impact: falling sine plus rumble
    "boom": ("aevalsrc=0.9*sin(2*PI*(38+50*exp(-4*t))*t)*exp(-1.6*t)+0.25*sin(2*PI*76*t)*exp(-3*t):d=3:s=48000", "lowpass=f=400,aecho=0.8:0.5:60:0.3"),
    # clock tick
    "tick": ("aevalsrc=0.8*sin(2*PI*2400*t)*exp(-70*t)+0.5*sin(2*PI*1100*t)*exp(-45*t):d=0.12:s=48000", "highpass=f=400"),
    # soft blip when a number appears
    "blip": ("aevalsrc=0.5*sin(2*PI*880*t)*exp(-9*t)+0.3*sin(2*PI*1320*t)*exp(-12*t)+0.15*sin(2*PI*1760*t)*exp(-16*t):d=0.6:s=48000", "aecho=0.6:0.5:90:0.2"),
    # cold wind, slowly rising and falling (loops)
    "wind": ("anoisesrc=color=brown:d=24:a=0.9", "bandpass=f=500:width_type=h:w=600,tremolo=f=0.12:d=0.7,volume=2.2,afade=t=in:d=2,afade=t=out:st=22:d=2"),
    # under water: muffled rumble with a few rising bubbles (loops)
    "underwater": ("aevalsrc=0.6*sin(2*PI*(500+900*mod(t\\,1.7))*t)*exp(-25*mod(t\\,1.7))*lt(mod(t\\,5.1)\\,1.7)+0.4*sin(2*PI*(700+1100*mod(t\\,2.3))*t)*exp(-30*mod(t\\,2.3))*lt(mod(t\\,6.9)\\,2.3):d=24:s=48000",
                   "lowpass=f=1800,volume=0.5"),
}


def run(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def normalize(path, peak=-3.0):
    # bring every effect to the same peak so the mix levels live in the video code
    info = subprocess.run(["ffmpeg", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    mx = float(info.split("max_volume:")[1].split("dB")[0])
    tmp = path.with_suffix(".tmp.wav")
    run("ffmpeg", "-y", "-i", str(path), "-af", f"volume={peak - mx:.2f}dB", str(tmp))
    tmp.replace(path)


def main(video_id):
    out = ROOT / "public" / video_id / "sfx"
    out.mkdir(parents=True, exist_ok=True)
    for name, (src, af) in SFX.items():
        dst = out / f"{name}.wav"
        if name == "underwater":
            # bubbles on top of a low rumble
            run("ffmpeg", "-y", "-f", "lavfi", "-i", src, "-f", "lavfi", "-i", "anoisesrc=color=brown:d=24:a=0.9",
                "-filter_complex", f"[0]{af}[b];[1]lowpass=f=260,tremolo=f=0.1:d=0.5,volume=2.5[r];[b][r]amix=inputs=2:normalize=0,afade=t=in:d=2,afade=t=out:st=22:d=2",
                "-ac", "2", "-ar", str(RATE), str(dst))
        else:
            run("ffmpeg", "-y", "-f", "lavfi", "-i", src, "-af", af, "-ac", "2", "-ar", str(RATE), str(dst))
        normalize(dst)
        print(f"  {dst.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python3 scripts/sfx.py <video-id>")
    main(sys.argv[1])
