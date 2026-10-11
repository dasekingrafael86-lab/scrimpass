"""Erzeugt static/i18n-en.js aus i18n/en.txt (+ i18n/patterns.js).

Aufruf:  python3 i18n/build.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "static" / "i18n-en.js"


def main():
    pairs = {}
    problems = []
    for no, raw in enumerate((HERE / "en.txt").read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if " ||| " not in line:
            problems.append(f"Zeile {no}: kein ' ||| ' gefunden: {line[:60]}")
            continue
        de, en = (part.strip() for part in line.split(" ||| ", 1))
        de = " ".join(de.split())
        if de in pairs and pairs[de] != en:
            problems.append(f"Zeile {no}: doppelt mit anderer Übersetzung: {de[:60]}")
        pairs[de] = en
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    js = (
        "/* AUTOMATISCH ERZEUGT aus i18n/en.txt + i18n/patterns.js – nicht von Hand bearbeiten.\n"
        "   Neu bauen: python3 i18n/build.py */\n"
        "window.SP_I18N_EN = " + json.dumps(pairs, ensure_ascii=False, indent=0) + ";\n"
        + (HERE / "patterns.js").read_text(encoding="utf-8")
    )
    OUT.write_text(js, encoding="utf-8")
    print(f"{len(pairs)} Einträge -> {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
