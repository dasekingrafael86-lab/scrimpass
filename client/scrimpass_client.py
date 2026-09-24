"""
ScrimPass Companion-Client (läuft als Tray-Symbol im Hintergrund)
==================================================================

Kein Fenster, keine Eingaben: Programm starten, fertig. Nach dem Start
erscheint unten rechts in der Windows-Taskleiste (System Tray) ein
ScrimPass-Symbol — daran erkennt man zuverlässig, dass der Client aktiv
läuft, ohne ein Fenster offen halten zu müssen.

* Verbindung: Der Download von der SP-Client-Seite in ScrimPass trägt im
  Dateinamen einen einmaligen Code und die Server-Adresse. Beim ersten Start
  liest der Client beides aus seinem eigenen Dateinamen und speichert danach
  nur noch einen Token lokal (%APPDATA%\\ScrimPass\\client.json).
* Aktivierung: Für alle Runden, für die du dich angemeldet hast, aktiviert
  sich der Client selbst (nur vor der offiziellen Startzeit gültig — also
  einfach vorher starten).
* Ergebnis: Aus Fortnites lokalem Log erkennt er, welche Platzierung du im
  Scrim-Match erreicht hast, und meldet sie an ScrimPass.
* Replay-Upload: zusätzlich lädt er nach dem Match automatisch die von
  Fortnite gespeicherte Replay-Datei hoch (Aufzeichnung ist standardmäßig
  an) — daraus lassen sich Platzierungen für die GANZE Lobby rekonstruieren,
  nicht nur die eigene, robust auch wenn andere Mitspieler ihren Client
  vergessen haben zu aktivieren.

WIE DIE ERKENNUNG FUNKTIONIERT: Fortnite loggt die Platzierung nirgendwo als
Klartext-Zahl. Die Discord/Epic-"Rich Presence"-Statuszeile (z.B. "Reload
Build Ranked Solo – 18 übrig") wird aber laufend mitgeloggt und zählt live
die verbleibenden Spieler/Teams herunter. Sobald das Log meldet, dass die
eigene Platzierung feststeht ("LocalPlacementChanged"), gilt der nächste
"X übrig"-Wert als finale Platzierung. Details und Einschränkungen: README.md.

Status/Fehler stehen in %APPDATA%\\ScrimPass\\client.log. Beenden: Rechtsklick
auf das Tray-Symbol -> "Beenden" — oder Task-Manager (ScrimPassClient.exe),
oder in ScrimPass unter SP-Client -> "Trennen".
"""

import argparse
import base64
import ctypes
import json
import logging
import os
import re
import socket
import sys
import threading
import time
import webbrowser
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path

import pystray
import requests
from PIL import Image, ImageDraw

APP_DIR = Path(os.environ.get("APPDATA") or Path.home()) / "ScrimPass"
CONFIG_PATH = APP_DIR / "client.json"
LOG_PATH = APP_DIR / "client.log"

# Wo Fortnite unter Windows sein Live-Log ablegt.
FORTNITE_LOG_PATH = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / \
    "FortniteGame" / "Saved" / "Logs" / "FortniteGame.log"
# Wo Fortnite die automatisch aufgezeichneten Replay-Dateien ablegt
# ("Wiederholungen aufzeichnen" ist standardmäßig an — die meisten Spieler
# müssen dafür nichts extra einstellen).
FORTNITE_REPLAYS_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / \
    "FortniteGame" / "Saved" / "Demos"

SINGLE_INSTANCE_PORT = 47653
POLL_INTERVAL_SECONDS = 60
REPORT_RETRIES = 5
REPORT_RETRY_SECONDS = 15
# Nach Rundenende so lange auf die Replay-Datei warten (Fortnite schreibt sie
# erst mit kurzer Verzögerung), bevor aufgegeben wird — der Upload ist ein
# reines Zusatzfeature, kein Blocker für den Rest des Programms.
REPLAY_WAIT_SECONDS = 120
REPLAY_POLL_INTERVAL_SECONDS = 5

# Ein Fortnite-Match zählt nur dann als Scrim-Runde, wenn es im Zeitfenster um
# deren offizielle Startzeit beginnt — sonst würde jedes beliebige Match
# gemeldet, das man zufällig spielt, während der Client läuft. Bewusst knapp
# vor Rundenstart (nicht mehr Zeit als nötig, um Matches vor Turnierbeginn
# nicht versehentlich mitzuzählen) — muss zum serverseitigen
# CLIENT_MATCH_EARLIEST in app.py passen.
MATCH_WINDOW_BEFORE = timedelta(minutes=5)
MATCH_WINDOW_AFTER = timedelta(minutes=90)

# So lange wartet der Client nach "Platzierung steht fest" auf das nächste
# "X übrig"-Update (kommt im echten Log ~1,3 s später), bevor er mit dem
# zuletzt bekannten Wert abschließt.
PLACEMENT_SETTLE_SECONDS = 8

# ---------------------------------------------------------------------------
# Log-Muster. Bislang nur gegen ein echtes deutschsprachiges Log verifiziert
# (drei Matches, Platz 18/17/9). Der englische Eintrag ist ungetestet.
# ---------------------------------------------------------------------------
REMAINING_PATTERNS = [
    re.compile(r"RichText=\[[^\]]*?[–-]\s*(\d+)\s*übrig\]"),
    re.compile(r"RichText=\[[^\]]*?[–-]\s*(\d+)\s*remaining\]"),
]
MATCH_START_RE = re.compile(r"MatchState changed previous=WaitingToStart current=InProgress")
MATCH_LOADING_NEXT_RE = re.compile(r"MatchState changed previous=EnteringMap current=WaitingToStart")
PLACEMENT_KNOWN_RE = re.compile(r"LogFortPostGamePlacementOverlay:.*LocalPlacementChanged")

# Dateiname des Downloads: ScrimPassClient_<CODE16>_<BASE32-SERVERADRESSE>.exe
DOWNLOAD_NAME_RE = re.compile(r"_([A-HJ-NP-Z2-9]{16})_([A-Z2-7]+)", re.IGNORECASE)

log = logging.getLogger("scrimpass_client")


def parse_server_time(value):
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def parse_download_name(file_name):
    """(code, server_url) aus dem Dateinamen — oder None."""
    m = DOWNLOAD_NAME_RE.search(file_name)
    if not m:
        return None
    code = m.group(1).upper()
    b32 = m.group(2).upper()
    try:
        server = base64.b32decode(b32 + "=" * (-len(b32) % 8)).decode("utf-8")
    except Exception:
        return None
    if not server.startswith(("http://", "https://")):
        return None
    return code, server


class MatchTracker:
    """Verfolgt höchstens EIN Match gleichzeitig: wartet, bis im Log ein
    Match startet, das ins Zeitfenster einer aktivierten Runde fällt, merkt
    sich die "X übrig"-Werte und meldet die Platzierung, sobald sie feststeht.

    Thread-sicher: feed_line/tick kommen vom Log-Thread, set_rounds vom
    Synchronisations-Thread."""

    IDLE = "idle"
    IN_MATCH = "in_match"

    def __init__(self, on_result, on_match_start=None, clock=None):
        self.on_result = on_result  # callback(round_id, placement) — darf nicht blockieren
        self.on_match_start = on_match_start  # callback(round_id) — darf nicht blockieren
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self._lock = threading.Lock()
        self.rounds = {}  # round_id -> offizielle Startzeit (nur aktivierte Runden)
        self.done = set()
        self.state = self.IDLE
        self.current_round = None
        self.last_remaining = None
        self.placement_known_at = None

    def set_rounds(self, rounds):
        with self._lock:
            self.rounds = {rid: starts for rid, starts in rounds.items() if rid not in self.done}

    def _pick_round(self, now):
        best = None
        for rid, starts in self.rounds.items():
            if starts - MATCH_WINDOW_BEFORE <= now <= starts + MATCH_WINDOW_AFTER:
                distance = abs((now - starts).total_seconds())
                if best is None or distance < best[0]:
                    best = (distance, rid)
        return best[1] if best else None

    @staticmethod
    def _parse_remaining(line):
        for pattern in REMAINING_PATTERNS:
            m = pattern.search(line)
            if m:
                return int(m.group(1))
        return None

    def _finish(self, placement):
        round_id = self.current_round
        self.state = self.IDLE
        self.current_round = None
        self.last_remaining = None
        self.placement_known_at = None
        if placement is None:
            log.warning("Runde #%s: Match zu Ende, aber keine Platzierung im Log gefunden.", round_id)
            return
        self.done.add(round_id)
        self.rounds.pop(round_id, None)
        log.info("Runde #%s: Platzierung %s erkannt.", round_id, placement)
        self.on_result(round_id, placement)

    def feed_line(self, line):
        with self._lock:
            if self.state == self.IDLE:
                if MATCH_START_RE.search(line):
                    round_id = self._pick_round(self.clock())
                    if round_id is None:
                        log.info("Match gestartet, gehört aber zu keiner aktivierten Runde — ignoriert.")
                        return
                    self.state = self.IN_MATCH
                    self.current_round = round_id
                    self.last_remaining = None
                    self.placement_known_at = None
                    log.info("Runde #%s: Match gestartet, verfolge Platzierung.", round_id)
                    if self.on_match_start:
                        self.on_match_start(round_id)
                return

            count = self._parse_remaining(line)
            if count is not None:
                if self.placement_known_at is not None:
                    # Erstes Update NACH dem eigenen Ausscheiden = finaler Stand.
                    # Alles danach (Zuschauen) darf die Platzierung nicht mehr ändern.
                    self._finish(count)
                else:
                    self.last_remaining = count
                return
            if PLACEMENT_KNOWN_RE.search(line):
                if self.placement_known_at is None:
                    self.placement_known_at = self.clock()
                return
            if MATCH_LOADING_NEXT_RE.search(line) or MATCH_START_RE.search(line):
                self._finish(self.last_remaining)

    def tick(self):
        with self._lock:
            if self.state == self.IN_MATCH and self.placement_known_at is not None:
                waited = (self.clock() - self.placement_known_at).total_seconds()
                if waited >= PLACEMENT_SETTLE_SECONDS:
                    self._finish(self.last_remaining)


class LogTailer(threading.Thread):
    """Liest die Fortnite-Logdatei fortlaufend (wie `tail -f`). Beim Start
    wird das bestehende Log übersprungen; startet Fortnite neu und legt die
    Datei frisch an, wird sie von vorne gelesen."""

    def __init__(self, log_path, on_line, on_idle):
        super().__init__(daemon=True)
        self.log_path = log_path
        self.on_line = on_line
        self.on_idle = on_idle
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()

    def run(self):
        handle = None
        inode = None
        pending = ""
        first_open = True
        last_check = time.monotonic()
        while not self._stop_event.is_set():
            try:
                if handle is None:
                    if not self.log_path.exists():
                        time.sleep(3)
                        continue
                    handle = open(self.log_path, "r", encoding="utf-8", errors="ignore")
                    inode = os.fstat(handle.fileno()).st_ino
                    if first_open:
                        handle.seek(0, os.SEEK_END)
                    first_open = False
                    pending = ""
                    log.info("Fortnite-Log wird verfolgt: %s", self.log_path)

                chunk = handle.readline()
                if chunk:
                    pending += chunk
                    if pending.endswith("\n"):
                        self.on_line(pending)
                        pending = ""
                    continue

                self.on_idle()
                time.sleep(0.3)
                if time.monotonic() - last_check > 2:
                    last_check = time.monotonic()
                    try:
                        stat = os.stat(self.log_path)
                    except FileNotFoundError:
                        handle.close()
                        handle = None
                        continue
                    if stat.st_ino != inode or stat.st_size < handle.tell():
                        handle.close()
                        handle = None
            except Exception:
                log.exception("Fehler beim Lesen des Fortnite-Logs")
                if handle:
                    try:
                        handle.close()
                    except Exception:
                        pass
                handle = None
                time.sleep(3)


class AuthRevoked(Exception):
    """Der Server kennt den Token nicht mehr (in ScrimPass getrennt)."""


class ApiClient:
    def __init__(self, api_base, token=None):
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.http = requests.Session()

    def _request(self, method, path, **kwargs):
        headers = kwargs.pop("headers", {})
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        kwargs.setdefault("timeout", 15)
        res = self.http.request(method, f"{self.api_base}{path}", headers=headers, **kwargs)
        if res.status_code == 401 and self.token:
            raise AuthRevoked()
        return res

    def pair_exchange(self, code, label):
        res = self._request("POST", "/api/client/pair/exchange", json={"code": code, "label": label})
        res.raise_for_status()
        return res.json()

    def list_matches(self):
        res = self._request("GET", "/api/client/matches")
        res.raise_for_status()
        return res.json().get("matches", [])

    def activate(self, round_id):
        return self._request("POST", f"/api/client/matches/{round_id}/activate")

    def report(self, round_id, placement):
        return self._request("POST", f"/api/client/matches/{round_id}/report", json={"placement": placement})

    def upload_replay(self, round_id, file_path):
        # Replay-Dateien können recht groß sein und je nach Upload-Geschwindigkeit
        # lange dauern — deutlich längeres Timeout als für die übrigen, kleinen
        # Anfragen.
        with open(file_path, "rb") as f:
            return self._request(
                "POST", f"/api/client/matches/{round_id}/replay",
                files={"replay": (file_path.name, f, "application/octet-stream")},
                timeout=600,
            )


def _newest_replay_mtime():
    """Jüngste Änderungszeit unter allen .replay-Dateien im Demos-Ordner (0,
    falls der Ordner fehlt oder leer ist)."""
    try:
        files = list(FORTNITE_REPLAYS_DIR.glob("*.replay"))
    except OSError:
        return 0.0
    if not files:
        return 0.0
    return max(f.stat().st_mtime for f in files if f.exists())


class Service:
    def __init__(self, api, stop_callback):
        self.api = api
        self.stop_callback = stop_callback
        self.tracker = MatchTracker(self._report_async, on_match_start=self._on_match_start)
        self._replay_baseline_mtime = 0.0

    def _on_match_start(self, round_id):
        # Merkt sich den Stand VOR diesem Match, damit nachher zuverlässig nur
        # eine neu hinzugekommene Replay-Datei erkannt wird — nicht eine
        # ältere von einem früheren, unrelated Match.
        self._replay_baseline_mtime = _newest_replay_mtime()

    def _report_async(self, round_id, placement):
        threading.Thread(target=self._report, args=(round_id, placement), daemon=True).start()
        threading.Thread(target=self._upload_replay, args=(round_id,), daemon=True).start()

    def _upload_replay(self, round_id):
        """Sucht nach Matchende (Fortnite schreibt die Datei mit kurzer
        Verzögerung) nach einer neuen Replay-Datei und lädt sie hoch. Rein
        zusätzlich zur eigenen Platzierungsmeldung — schlägt das fehl (Ordner
        fehlt, Zeitfenster verpasst, keine Verbindung), bleibt einfach alles
        beim bisherigen Stand."""
        baseline = self._replay_baseline_mtime
        deadline = time.monotonic() + REPLAY_WAIT_SECONDS
        found = None
        while time.monotonic() < deadline:
            try:
                candidates = [
                    f for f in FORTNITE_REPLAYS_DIR.glob("*.replay")
                    if f.exists() and f.stat().st_mtime > baseline
                ]
            except OSError:
                candidates = []
            if candidates:
                found = max(candidates, key=lambda f: f.stat().st_mtime)
                break
            time.sleep(REPLAY_POLL_INTERVAL_SECONDS)
        if not found:
            log.info("Runde #%s: keine neue Replay-Datei gefunden — übersprungen.", round_id)
            return

        # Kurz abwarten, bis die Dateigröße sich nicht mehr ändert (Fortnite
        # schreibt die Datei ggf. noch), bevor hochgeladen wird.
        last_size = -1
        for _ in range(20):
            try:
                size = found.stat().st_size
            except OSError:
                return
            if size == last_size:
                break
            last_size = size
            time.sleep(1)

        try:
            res = self.api.upload_replay(round_id, found)
        except AuthRevoked:
            self.stop_callback()
            return
        except (requests.exceptions.RequestException, OSError) as e:
            log.warning("Runde #%s: Replay-Upload fehlgeschlagen: %s", round_id, e)
            return
        if res.ok:
            log.info("Runde #%s: Replay-Datei hochgeladen (%s).", round_id, found.name)
        else:
            log.warning("Runde #%s: Replay-Upload abgelehnt (%s): %s", round_id, res.status_code, res.text[:200])

    def _report(self, round_id, placement):
        for attempt in range(1, REPORT_RETRIES + 1):
            try:
                res = self.api.report(round_id, placement)
            except AuthRevoked:
                self.stop_callback()
                return
            except requests.exceptions.RequestException as e:
                log.warning("Meldung Runde #%s (Versuch %s): keine Verbindung: %s", round_id, attempt, e)
                time.sleep(REPORT_RETRY_SECONDS)
                continue
            if res.ok:
                log.info("Runde #%s: Platz %s an ScrimPass gemeldet.", round_id, placement)
            else:
                # Vom Server abgelehnt (z. B. Zeitfenster) — Wiederholen bringt nichts.
                log.warning("Runde #%s: Meldung abgelehnt (%s): %s", round_id, res.status_code, res.text[:200])
            return
        log.error("Runde #%s: Meldung nach %s Versuchen aufgegeben.", round_id, REPORT_RETRIES)

    def sync_rounds(self):
        """Aktiviert sich für alle zugesagten Runden, die noch nicht begonnen
        haben, und gibt dem Tracker die aktivierten Runden."""
        now = datetime.now(timezone.utc)
        armed = {}
        for m in self.api.list_matches():
            if m.get("reported"):
                continue
            starts_at = parse_server_time(m["startsAt"])
            if not m.get("checkedIn"):
                if now >= starts_at:
                    continue  # zu spät gestartet — Admin trägt von Hand ein
                res = self.api.activate(m["id"])
                if not res.ok:
                    log.warning("Aktivierung Runde #%s fehlgeschlagen: %s", m["id"], res.text[:200])
                    continue
                log.info("Runde #%s aktiviert.", m["id"])
            armed[m["id"]] = starts_at
        self.tracker.set_rounds(armed)

    def run(self):
        tailer = LogTailer(FORTNITE_LOG_PATH, self.tracker.feed_line, self.tracker.tick)
        tailer.start()
        while True:
            try:
                self.sync_rounds()
            except AuthRevoked:
                self.stop_callback()
                return
            except requests.exceptions.RequestException as e:
                log.warning("ScrimPass nicht erreichbar: %s", e)
            except Exception:
                log.exception("Unerwarteter Fehler bei der Synchronisation")
            time.sleep(POLL_INTERVAL_SECONDS)


def setup_logging():
    APP_DIR.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(LOG_PATH, maxBytes=200_000, backupCount=1, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    log.setLevel(logging.INFO)
    log.addHandler(handler)


def load_config():
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_config(cfg):
    APP_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")


def show_error(text):
    """Einziges Fenster, das der Client je zeigt: eine Fehlermeldung, wenn er
    sich nicht verbinden kann (noch bevor das Tray-Symbol erscheint)."""
    log.error(text)
    if sys.platform == "win32":
        try:
            ctypes.windll.user32.MessageBoxW(0, text, "ScrimPass-Client", 0x10)
        except Exception:
            pass
    else:
        print(text, file=sys.stderr)


def acquire_single_instance():
    guard = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        guard.bind(("127.0.0.1", SINGLE_INSTANCE_PORT))
        guard.listen(1)
    except OSError:
        return None
    return guard


def own_file_name():
    return Path(sys.executable if getattr(sys, "frozen", False) else sys.argv[0]).name


def pair(server, code):
    label = os.environ.get("COMPUTERNAME") or socket.gethostname()
    data = ApiClient(server).pair_exchange(code, label)
    cfg = {"api_base": server, "token": data["token"], "username": data.get("username", "")}
    save_config(cfg)
    log.info("Mit ScrimPass-Konto %s verbunden (%s).", cfg["username"], server)
    return cfg


def _tray_icon_image():
    """Zeichnet das Tray-Symbol zur Laufzeit (kein externes Bild nötig, damit
    PyInstaller nichts zusätzlich bündeln muss) -- ausgefüllter Kreis in
    ScrimPass-Gold mit einem Haken, als klares "aktiv/verbunden"-Signal."""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((2, 2, size - 2, size - 2), fill=(240, 180, 41, 255))
    draw.line([(17, 33), (27, 43), (47, 19)], fill=(26, 19, 5, 255), width=6, joint="curve")
    return img


def build_tray_icon(cfg, on_quit):
    """Erstellt das Tray-Icon-Objekt (noch nicht gestartet -- dafür
    icon.run() im Hauptthread aufrufen). Rechtsklick zeigt ein Menü,
    Doppelklick öffnet ScrimPass im Browser (Standardaktion)."""
    username = cfg.get("username") or "?"
    api_base = cfg["api_base"]

    def open_scrimpass(icon, item):
        webbrowser.open(api_base)

    def quit_client(icon, item):
        icon.stop()
        on_quit()

    menu = pystray.Menu(
        pystray.MenuItem(f"🟢 Aktiv — verbunden als {username}", None, enabled=False),
        pystray.MenuItem("ScrimPass öffnen", open_scrimpass, default=True),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Beenden", quit_client),
    )
    return pystray.Icon(
        "ScrimPassClient", _tray_icon_image(), f"ScrimPass-Client – Aktiv ({username})", menu
    )


def main():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--server")
    parser.add_argument("--code")
    args, _ = parser.parse_known_args()

    setup_logging()
    guard = acquire_single_instance()
    if guard is None:
        return 0  # läuft bereits

    cfg = load_config()
    if not cfg.get("token"):
        server, code = args.server, args.code
        if not (server and code):
            parsed = parse_download_name(own_file_name())
            if parsed:
                code, server = parsed
        if not (server and code):
            show_error(
                "Dieser Client ist noch keinem ScrimPass-Konto zugeordnet.\n\n"
                "Bitte lade ihn auf der Seite \"SP-Client\" in ScrimPass herunter und "
                "starte genau diese Datei (Dateinamen nicht ändern)."
            )
            return 1
        try:
            cfg = pair(server, code)
        except Exception as e:
            log.error("Verbindung fehlgeschlagen: %s", e)
            show_error(
                "Die Verbindung mit ScrimPass ist fehlgeschlagen.\n\n"
                "Der Download-Code ist abgelaufen oder wurde schon verwendet, oder ScrimPass "
                "ist nicht erreichbar. Bitte lade den Client auf der Seite \"SP-Client\" "
                "erneut herunter."
            )
            return 1

    def on_revoked():
        log.warning("Client wurde in ScrimPass getrennt — beende mich.")
        try:
            CONFIG_PATH.unlink()
        except FileNotFoundError:
            pass
        os._exit(0)  # beendet auch den Tray-Icon-Thread sofort mit

    # Die eigentliche Arbeit (Log verfolgen, Runden synchronisieren, melden)
    # läuft im Hintergrund-Thread weiter -- der Hauptthread wird für das
    # Tray-Icon gebraucht (icon.run() blockiert, bis "Beenden" geklickt wird).
    service = Service(ApiClient(cfg["api_base"], cfg["token"]), on_revoked)
    threading.Thread(target=service.run, daemon=True).start()

    tray_icon = build_tray_icon(cfg, on_quit=lambda: None)
    tray_icon.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
