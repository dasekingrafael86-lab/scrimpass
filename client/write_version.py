"""Hält die Versionsnummer des Clients an EINER Stelle: CLIENT_VERSION in
scrimpass_client.py. Aufgerufen von build_exe.bat:

    python write_version.py --prepare   vor dem Build: trägt die Version in
                                        version_info.txt ein (Metadaten der .exe)
    python write_version.py             nach dem Build: schreibt dist/version.txt --
                                        ScrimPass liest daraus, welche Version die
                                        bereitgestellte .exe hat
"""
import pathlib
import re
import sys

here = pathlib.Path(__file__).resolve().parent
source = (here / "scrimpass_client.py").read_text(encoding="utf-8")
version = re.search(r'^CLIENT_VERSION = "([^"]+)"', source, re.M).group(1)

if "--prepare" in sys.argv:
    parts = [str(int(p)) for p in (version.split(".") + ["0", "0", "0", "0"])[:4]]
    as_tuple, dotted = ", ".join(parts), ".".join(parts)
    info_path = here / "version_info.txt"
    info = info_path.read_text(encoding="utf-8")
    info = re.sub(r"filevers=\([^)]*\)", f"filevers=({as_tuple})", info)
    info = re.sub(r"prodvers=\([^)]*\)", f"prodvers=({as_tuple})", info)
    info = re.sub(r"(u'FileVersion', u')[^']*(')", rf"\g<1>{dotted}\g<2>", info)
    info = re.sub(r"(u'ProductVersion', u')[^']*(')", rf"\g<1>{dotted}\g<2>", info)
    info_path.write_text(info, encoding="utf-8")
    print("version_info.txt:", dotted)
else:
    (here / "dist").mkdir(exist_ok=True)
    (here / "dist" / "version.txt").write_text(version, encoding="utf-8")
    print("Client-Version:", version)
