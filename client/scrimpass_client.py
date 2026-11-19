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
  Scrim-Match erreicht hast, und meldet sie an ScrimPass -- zusammen mit der
  (im Log gekürzten) ID des in Fortnite angemeldeten Epic-Kontos. Der Server
  wertet nur Ergebnisse des mit ScrimPass verknüpften Epic-Kontos.
* Replay-Upload: zusätzlich lädt er nach dem Match automatisch die von
  Fortnite gespeicherte Replay-Datei hoch (Aufzeichnung ist standardmäßig
  an) — daraus liest der Server Platzierungen UND Kills der GANZEN Lobby und
  prüft, wer wirklich mitgespielt hat. Das läuft doppelt abgesichert: einmal
  angestoßen vom Log (Matchende), und unabhängig davon durch einen Wächter,
  der den Replay-Ordner beobachtet (falls der Client erst mitten im Match
  gestartet wurde oder das Log nichts hergab).

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
import hashlib
import json
import logging
import os
import re
import socket
import struct
import subprocess
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
# Namen der schon hochgeladenen Replay-Dateien (damit nach einem Neustart
# nichts doppelt hochgeladen wird).
UPLOADED_PATH = APP_DIR / "uploaded_replays.json"

# Wo Fortnite unter Windows sein Live-Log ablegt.
FORTNITE_LOG_PATH = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / \
    "FortniteGame" / "Saved" / "Logs" / "FortniteGame.log"
# Wo Fortnite die automatisch aufgezeichneten Replay-Dateien ablegt
# ("Wiederholungen aufzeichnen" ist standardmäßig an — die meisten Spieler
# müssen dafür nichts extra einstellen).
FORTNITE_REPLAYS_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / \
    "FortniteGame" / "Saved" / "Demos"

# Muss von Hand zu CLIENT_LATEST_VERSION in app.py passen und bei jedem neuen
# Build hochgezählt werden -- siehe Service._check_version.
CLIENT_VERSION = "1.0.5"
# Mit jeder Anfrage mitgeschickt: der Server wertet Meldungen und Replays nur von
# Clients ab seiner Mindestversion (MIN_CLIENT_VERSION in app.py).
CLIENT_VERSION_HEADER = "X-ScrimPass-Client-Version"

SINGLE_INSTANCE_PORT = 47653
POLL_INTERVAL_SECONDS = 60
# Kein automatisches Update -- nur eine Tray-Benachrichtigung, wenn eine neue
# Version verfügbar ist. Muss nicht bei jedem 60s-Sync geprüft werden.
VERSION_CHECK_INTERVAL_SECONDS = 30 * 60
# Auto-Update: erster Blick auf die Server-Version kurz nach dem Start, und
# wenn gerade eine Runde läuft, nach wenigen Minuten erneut.
FIRST_VERSION_CHECK_AFTER_SECONDS = 2 * 60
UPDATE_RETRY_SECONDS = 5 * 60
# Nie aktualisieren, solange eine Runde gleich beginnt oder gerade läuft
# (inklusive Zeit für den Replay-Upload danach).
UPDATE_QUIET_BEFORE_ROUND = timedelta(minutes=15)
UPDATE_QUIET_AFTER_ROUND_START = timedelta(minutes=90)
UPDATE_MAX_ATTEMPTS = 3
REPORT_RETRIES = 5
REPORT_RETRY_SECONDS = 15
# Nach Rundenende so lange auf die Replay-Datei warten (Fortnite schreibt sie
# erst mit kurzer Verzögerung), bevor aufgegeben wird — der Upload ist ein
# reines Zusatzfeature, kein Blocker für den Rest des Programms.
REPLAY_WAIT_SECONDS = 120
REPLAY_POLL_INTERVAL_SECONDS = 5
# Fortnite nimmt nach dem eigenen Ausscheiden weiter auf (Zuschauen) und
# schließt die Datei erst ab, wenn man zurück in der Lobby ist. Eine noch
# laufende Aufnahme ist verschlüsselt und lässt sich nicht auswerten --
# deshalb so lange warten, bis der Datei-Kopf "fertig" meldet.
REPLAY_FINALIZE_WAIT_SECONDS = 60 * 60
REPLAY_FINALIZE_POLL_SECONDS = 10
# Unabhängig vom Log schaut der Client regelmäßig in den Replay-Ordner: jede
# fertig aufgezeichnete Replay, deren Match im Zeitfenster einer angemeldeten
# Runde begann, wird hochgeladen. Das funktioniert auch, wenn der Client erst
# mitten im Match gestartet wurde, das Log die Platzierung nicht hergab oder
# man lange zugeschaut hat -- der Server prüft anhand des Inhalts, ob die
# Replay wirklich zur Runde gehört.
REPLAY_WATCH_INTERVAL_SECONDS = 20
# Fortnite benennt automatische Aufnahmen nach dem Matchbeginn (Ortszeit des PCs):
# UnsavedReplay-2026.11.18-17.31.05.replay
REPLAY_NAME_RE = re.compile(r"(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2})")
# So weit dürfen die Uhrzeit im Dateinamen und die Anlegezeit der Datei auseinanderliegen.
REPLAY_START_TOLERANCE = timedelta(minutes=3)

# Ein Fortnite-Match zählt nur dann als Scrim-Runde, wenn es im Zeitfenster um
# deren offizielle Startzeit beginnt — sonst würde jedes beliebige Match
# gemeldet, das man zufällig spielt, während der Client läuft. Bewusst knapp
# vor Rundenstart (nicht mehr Zeit als nötig, um Matches vor Turnierbeginn
# nicht versehentlich mitzuzählen) — muss zum serverseitigen
# CLIENT_MATCH_EARLIEST in app.py passen.
MATCH_WINDOW_BEFORE = timedelta(minutes=5)
MATCH_WINDOW_AFTER = timedelta(minutes=90)

# Wer den Client bis zu dieser Zeit NACH dem offiziellen Rundenstart aktiviert,
# zählt noch als rechtzeitig -- reine Kulanz für Ladebildschirm-/Bus-Verzögerung.
# Muss zum serverseitigen CLIENT_LATE_ACTIVATION_GRACE in app.py passen.
CLIENT_LATE_ACTIVATION_GRACE = timedelta(minutes=5)

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
# Team-Modus am Präsenz-Text erkennen ("... Unranked Duo – 70 übrig"). Dort
# zählt "X übrig" SPIELER statt Teams -- die Team-Platzierung kommt deshalb
# nicht aus dem Log, sondern serverseitig aus dem hochgeladenen Replay.
TEAM_MODE_RE = re.compile(r"RichText=\[[^\]]*\b(Duos?|Trios?|Squads?|Quads?)\b", re.IGNORECASE)
MATCH_START_RE = re.compile(r"MatchState changed previous=WaitingToStart current=InProgress")
MATCH_LOADING_NEXT_RE = re.compile(r"MatchState changed previous=EnteringMap current=WaitingToStart")
PLACEMENT_KNOWN_RE = re.compile(r"LogFortPostGamePlacementOverlay:.*LocalPlacementChanged")
# Epic-Konto, mit dem Fortnite angemeldet ist: Die Präsenz-Zeile ("LogEOSPresence:
# ... LocalUserId=[e7d...71f]") nennt die Epic-Konto-ID, gekürzt auf die ersten und
# letzten 3 Zeichen (an einem echten Log gegen die echte Konto-ID geprüft). Wird
# bei Meldung und Replay mitgeschickt -- der Server wertet nur Ergebnisse des
# verknüpften Epic-Kontos. NUR die Präsenz-Zeile zählt: andere EOS-Zeilen können
# unter "LocalUserId" eine andere Art von Kennung führen, und eine falsch
# gelesene Kennung würde das Ergebnis eines ehrlichen Spielers entwerten.
LOCAL_USER_RE = re.compile(
    r"LogEOSPresence\b.*?LocalUserId=\[([0-9a-fA-F]{3}\.\.\.[0-9a-fA-F]{3}|[0-9a-fA-F]{32})\]")
# Beim Start wird so viel vom Ende des bestehenden Logs nach dem angemeldeten
# Epic-Konto durchsucht (das Log selbst wird sonst erst ab jetzt gelesen).
LOG_BACKLOG_BYTES = 2 * 1024 * 1024

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
        self.tournament_rounds = set()  # Spiele eines Mehrspiel-Turniers
        # Duo/Trio-Runden laut Server: dort zählt "X übrig" SPIELER statt Teams.
        # Nicht vom Präsenz-Text abhängig machen -- der nennt den Modus in
        # Custom-Matches womöglich nicht.
        self.team_rounds = set()
        self.done = set()
        self.state = self.IDLE
        self.current_round = None
        self.last_remaining = None
        self.placement_known_at = None
        self.team_mode = False
        self.epic_hint = None  # gekürzte Epic-ID des in Fortnite angemeldeten Kontos

    def prime_epic_hint(self, text):
        """Beim Start: das zuletzt im bestehenden Log genannte Epic-Konto
        übernehmen -- sonst wäre es unbekannt, bis Fortnite die nächste
        Präsenz-Zeile schreibt (z. B. wenn nur noch ein altes Replay hochgeladen wird)."""
        last = None
        for m in LOCAL_USER_RE.finditer(text):
            last = m
        if last:
            with self._lock:
                if self.epic_hint is None:
                    self.epic_hint = last.group(1).lower()

    def set_rounds(self, rounds, tournament_rounds=(), team_rounds=()):
        """Turnier-Spiele bleiben auch nach einer Meldung aktiv: laufen die Spiele
        verspätet, fällt ein Match zeitlich ins Fenster eines anderen Spiels --
        der Server ordnet Meldung und Replay dann selbst dem richtigen Spiel zu.
        Würde der Client das Spiel als 'erledigt' streichen, ginge das nächste
        Match (und sein Replay) verloren."""
        with self._lock:
            self.tournament_rounds = set(tournament_rounds)
            self.team_rounds = set(team_rounds)
            self.rounds = {rid: starts for rid, starts in rounds.items()
                           if rid not in self.done or rid in self.tournament_rounds}

    def _pick_round(self, now):
        """Das Match gehört zur Runde mit der JÜNGSTEN offiziellen Startzeit, die
        schon erreicht ist (bzw. höchstens MATCH_WINDOW_BEFORE bevorsteht).
        Wichtig für Turniere mit mehreren Spielen direkt hintereinander (z. B. alle
        35 Minuten): ein verspätet gestartetes Spiel 1 darf nicht als Spiel 2
        zählen, nur weil dessen Startzeit zeitlich näher liegt."""
        candidates = [
            (starts, rid) for rid, starts in self.rounds.items()
            if starts - MATCH_WINDOW_BEFORE <= now <= starts + MATCH_WINDOW_AFTER
        ]
        return max(candidates)[1] if candidates else None

    @staticmethod
    def _parse_remaining(line):
        for pattern in REMAINING_PATTERNS:
            m = pattern.search(line)
            if m:
                return int(m.group(1))
        return None

    def _finish(self, placement):
        round_id = self.current_round
        team_mode = self.team_mode
        self.state = self.IDLE
        self.current_round = None
        self.last_remaining = None
        self.placement_known_at = None
        self.team_mode = False
        keep = round_id in self.tournament_rounds
        if team_mode:
            # Keine Platzierung melden (wäre die Spielerzahl), nur das Replay hochladen.
            self.done.add(round_id)
            if not keep:
                self.rounds.pop(round_id, None)
            log.info("Runde #%s: Team-Modus — Platzierung kommt aus dem Replay.", round_id)
            self.on_result(round_id, None)
            return
        if placement is None:
            # Trotzdem das Replay hochladen: daraus liest der Server Platzierung
            # und Kills der ganzen Lobby, auch ohne Platzierung aus dem Log.
            log.warning("Runde #%s: Match zu Ende, aber keine Platzierung im Log gefunden — lade nur das Replay hoch.", round_id)
            self.on_result(round_id, None)
            return
        self.done.add(round_id)
        if not keep:
            self.rounds.pop(round_id, None)
        log.info("Runde #%s: Platzierung %s erkannt.", round_id, placement)
        self.on_result(round_id, placement)

    def feed_line(self, line):
        with self._lock:
            m = LOCAL_USER_RE.search(line)
            if m:
                self.epic_hint = m.group(1).lower()
            if self.state == self.IDLE:
                if MATCH_START_RE.search(line):
                    self._begin_match()
                return

            if MATCH_START_RE.search(line):
                # Neues Match, obwohl das alte nie sauber endete (Absturz, Match
                # verlassen, Sieg ohne Platzierungs-Zeile): das alte abschließen und
                # das neue SOFORT verfolgen -- sonst ginge im Turnier das nächste
                # Spiel verloren.
                self._finish_unconfirmed()
                self._begin_match()
                return
            if TEAM_MODE_RE.search(line):
                self.team_mode = True
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
            if MATCH_LOADING_NEXT_RE.search(line):
                self._finish_unconfirmed()

    def _begin_match(self):
        round_id = self._pick_round(self.clock())
        if round_id is None:
            log.info("Match gestartet, gehört aber zu keiner aktivierten Runde — ignoriert.")
            return
        self.state = self.IN_MATCH
        self.current_round = round_id
        self.last_remaining = None
        self.placement_known_at = None
        self.team_mode = round_id in self.team_rounds
        log.info("Runde #%s: Match gestartet, verfolge Platzierung.", round_id)
        if self.on_match_start:
            self.on_match_start(round_id)

    def _finish_unconfirmed(self):
        """Match endet, ohne dass das Log die eigene Platzierung bestätigt hat.
        Der letzte "X übrig"-Wert ist dann nur ein Zwischenstand und würde -- erst
        beim nächsten Match gemeldet -- im Turnier womöglich dem falschen Spiel
        zugerechnet. Deshalb nur noch das Replay hochladen."""
        self._finish(self.last_remaining if self.placement_known_at is not None else None)

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

    def __init__(self, log_path, on_line, on_idle, on_backlog=None):
        super().__init__(daemon=True)
        self.log_path = log_path
        self.on_line = on_line
        self.on_idle = on_idle
        self.on_backlog = on_backlog  # callback(text): Ende des schon bestehenden Logs, einmal beim Start
        self._stop_event = threading.Event()

    def _read_backlog(self):
        if not self.on_backlog:
            return
        try:
            with open(self.log_path, "rb") as raw:
                raw.seek(0, os.SEEK_END)
                raw.seek(max(0, raw.tell() - LOG_BACKLOG_BYTES))
                self.on_backlog(raw.read().decode("utf-8", errors="ignore"))
        except OSError:
            pass

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
                        self._read_backlog()
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


class UpdateNotNeeded(Exception):
    """Die Datei auf dem Server ist genau die laufende .exe."""


class ApiClient:
    def __init__(self, api_base, token=None):
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.http = requests.Session()

    def _request(self, method, path, **kwargs):
        headers = kwargs.pop("headers", {})
        headers[CLIENT_VERSION_HEADER] = CLIENT_VERSION
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

    def download_update(self, url, dest, expected_size):
        """Lädt die neue .exe (Token-geschützt) nach dest herunter."""
        if url.startswith("/"):
            url = self.api_base + url
        headers = {CLIENT_VERSION_HEADER: CLIENT_VERSION}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        with self.http.get(url, headers=headers, stream=True, timeout=60) as res:
            if res.status_code == 401 and self.token:
                raise AuthRevoked()
            res.raise_for_status()
            written = 0
            with open(dest, "wb") as fh:
                for chunk in res.iter_content(256 * 1024):
                    written += len(chunk)
                    if expected_size and written > expected_size:
                        raise ValueError("Update-Datei größer als angekündigt")
                    fh.write(chunk)

    def info(self):
        # Öffentlicher Endpoint (keine Auth nötig) -- liefert u.a. die aktuell
        # auf dem Server bereitgestellte Client-Version.
        res = self._request("GET", "/api/client/info")
        res.raise_for_status()
        return res.json()

    def list_matches(self):
        res = self._request("GET", "/api/client/matches")
        res.raise_for_status()
        return res.json().get("matches", [])

    def activate(self, round_id):
        return self._request("POST", f"/api/client/matches/{round_id}/activate")

    def report(self, round_id, placement, epic_hint=None):
        body = {"placement": placement}
        if epic_hint:
            body["epicIdHint"] = epic_hint
        return self._request("POST", f"/api/client/matches/{round_id}/report", json=body)

    def replay_needed(self, round_id, length_ms=None):
        """Vorab-Frage vor einem Upload: Braucht der Server dieses Replay noch?
        Ist das Match längst vollständig ausgewertet, spart das den Upload."""
        body = {"lengthMs": length_ms} if length_ms else {}
        return self._request("POST", f"/api/client/matches/{round_id}/replay-needed", json=body)

    def upload_replay(self, round_id, file_path, started_at=None, epic_hint=None):
        # Replay-Dateien können recht groß sein und je nach Upload-Geschwindigkeit
        # lange dauern — deutlich längeres Timeout als für die übrigen, kleinen
        # Anfragen. started_at (bestätigter Matchbeginn) hilft dem Server, das
        # Replay dem richtigen Spiel zuzuordnen und Matches vor Rundenbeginn
        # auszusortieren. Mitgeschickt wird auch die aktuelle Uhrzeit dieses PCs:
        # der Server rechnet nur mit dem Abstand der beiden Zeiten, eine falsch
        # gehende PC-Uhr stört also nicht.
        data = {}
        if started_at:
            data.update({"startedAt": started_at.isoformat(), "sentAt": datetime.now(timezone.utc).isoformat()})
        if epic_hint:
            # Mit welchem Epic-Konto Fortnite angemeldet ist (gekürzt, aus dem Log).
            data["epicIdHint"] = epic_hint
        data = data or None
        with open(file_path, "rb") as f:
            return self._request(
                "POST", f"/api/client/matches/{round_id}/replay",
                files={"replay": (file_path.name, f, "application/octet-stream")},
                data=data,
                timeout=600,
            )


def replay_is_live(path):
    """True, solange Fortnite die Replay noch aufnimmt (IsLive-Flag im
    Datei-Kopf), False wenn abgeschlossen, None wenn nicht lesbar."""
    try:
        with open(path, "rb") as f:
            data = f.read(8192)
        off = 0

        def u32():
            nonlocal off
            v = struct.unpack_from("<I", data, off)[0]
            off += 4
            return v

        def i32():
            nonlocal off
            v = struct.unpack_from("<i", data, off)[0]
            off += 4
            return v

        if u32() != 0x1CA2E27F:
            return None
        if u32() >= 7:
            count = i32()
            off += count * 20
        u32(); u32(); u32()          # LengthInMs, NetworkVersion, Changelist
        name_len = i32()             # FriendlyName (FString, negativ = UTF-16)
        off += name_len if name_len >= 0 else -name_len * 2
        return u32() != 0
    except (OSError, struct.error):
        return None


def replay_length_ms(path):
    """Aufnahmelänge (Millisekunden) aus dem Kopf einer Replay-Datei, None wenn nicht lesbar."""
    try:
        with open(path, "rb") as f:
            data = f.read(8192)
        if struct.unpack_from("<I", data, 0)[0] != 0x1CA2E27F:
            return None
        off = 8
        if struct.unpack_from("<I", data, 4)[0] >= 7:
            off += 4 + struct.unpack_from("<i", data, 8)[0] * 20
        value = struct.unpack_from("<I", data, off)[0]
        return value if value > 0 else None
    except (OSError, struct.error):
        return None


def pick_replay_start(name_time, created, fallback):
    """(Matchbeginn als UTC-Zeit, bestätigt?) aus den Angaben zu einer Replay-Datei:
    name_time = Uhrzeit im Dateinamen (ohne Zeitzone), created = wann Windows die
    Datei angelegt hat, fallback = früheste Dateizeit.
    Bestätigt ist der Beginn nur, wenn Dateiname und Anlegezeit übereinstimmen --
    nur dann wird er dem Server als Hinweis mitgeschickt. Fortnite schreibt den
    Dateinamen in der Ortszeit des PCs; stünde er doch in Weltzeit, wird das am
    Abgleich mit der Anlegezeit erkannt. Bei einer umbenannten oder kopierten Datei
    bleibt die beste Schätzung fürs eigene Zeitfenster (unbestätigt)."""
    name_local = name_utc = None
    if name_time is not None:
        try:
            name_local = name_time.astimezone(timezone.utc)      # als Ortszeit des PCs gelesen
            name_utc = name_time.replace(tzinfo=timezone.utc)
        except (ValueError, OSError, OverflowError):
            name_local = name_utc = None
    if created is not None:
        for candidate in (name_local, name_utc):
            if candidate is not None and abs(candidate - created) <= REPLAY_START_TOLERANCE:
                return candidate, True
    if name_local is not None:
        return name_local, False
    return fallback, False


def replay_start_info(path):
    """(Matchbeginn als UTC-Zeit, bestätigt?) einer Replay-Datei, siehe pick_replay_start."""
    name_time = created = fallback = None
    m = REPLAY_NAME_RE.search(Path(path).name)
    if m:
        try:
            name_time = datetime(*(int(x) for x in m.groups()))
        except ValueError:
            name_time = None
    try:
        st = Path(path).stat()
        # Anlegezeit: unter Windows st_birthtime (neuere Python-Versionen) bzw. st_ctime.
        created = datetime.fromtimestamp(getattr(st, "st_birthtime", st.st_ctime), timezone.utc)
        fallback = datetime.fromtimestamp(min(st.st_ctime, st.st_mtime), timezone.utc)
    except (OSError, ValueError, OverflowError):
        created = fallback = None
    return pick_replay_start(name_time, created, fallback)


def replay_started_at(path):
    """Matchbeginn einer Replay-Datei als UTC-Zeit: aus dem Dateinamen
    (Ortszeit des PCs), ersatzweise aus der Erstellzeit der Datei. None, wenn
    sich nichts ermitteln lässt."""
    return replay_start_info(path)[0]


def load_uploaded_names():
    try:
        data = json.loads(UPLOADED_PATH.read_text(encoding="utf-8"))
        return [str(x) for x in data][-200:] if isinstance(data, list) else []
    except Exception:
        return []


def save_uploaded_names(names):
    try:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        UPLOADED_PATH.write_text(json.dumps(list(names)[-200:]), encoding="utf-8")
    except OSError:
        pass


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
    def __init__(self, api, stop_callback, on_update_available=None, on_notify=None):
        self.api = api
        self.stop_callback = stop_callback
        self.on_update_available = on_update_available
        self.on_notify = on_notify  # callback(titel, text) für Tray-Hinweise
        self.tracker = MatchTracker(self._report_async, on_match_start=self._on_match_start)
        self._replay_baseline_mtime = 0.0
        # Alle Runden, für die dieser Spieler angemeldet ist (auch schon gemeldete
        # oder zu spät aktivierte) -- Grundlage für den Replay-Wächter.
        self.watch_rounds = {}
        self._upload_lock = threading.Lock()
        self._uploaded = load_uploaded_names()   # Dateinamen, in Reihenfolge
        self._uploading = set()
        self._no_replay_notified = False
        # Erster Versions-Check nicht sofort beim Start (da ist das Tray-Icon im
        # Hauptthread evtl. noch nicht bereit), sondern nach ~2 Minuten.
        self._next_version_check = time.monotonic() + FIRST_VERSION_CHECK_AFTER_SECONDS
        self._update_notified = False
        self._update_attempts = 0
        self.can_self_update = can_self_update()
        self.restart_with = restart_with_new_exe  # für Tests austauschbar

    def _check_version(self):
        if self._update_notified or time.monotonic() < self._next_version_check:
            return
        self._next_version_check = time.monotonic() + VERSION_CHECK_INTERVAL_SECONDS
        try:
            info = self.api.info()
        except (requests.exceptions.RequestException, ValueError):
            return
        latest = info.get("latestVersion")
        if not latest or not is_newer_version(latest, CLIENT_VERSION):
            return
        if self.can_self_update and info.get("sha256") and info.get("updateUrl"):
            if not self._update_is_safe_now():
                log.info("Update auf %s wartet, bis keine Runde mehr läuft.", latest)
                self._next_version_check = time.monotonic() + UPDATE_RETRY_SECONDS
                return
            self._update_attempts += 1
            try:
                self._apply_update(info)  # kehrt bei Erfolg nicht zurück
                return
            except AuthRevoked:
                raise
            except UpdateNotNeeded:
                log.warning("Server-Datei entspricht der laufenden .exe (Version %s falsch gepflegt?) "
                            "-- kein Update.", latest)
                self._update_notified = True
                return
            except Exception:
                log.exception("Auto-Update auf %s fehlgeschlagen (Versuch %s).", latest, self._update_attempts)
            if self._update_attempts < UPDATE_MAX_ATTEMPTS:
                self._next_version_check = time.monotonic() + UPDATE_RETRY_SECONDS
                return
        # Kein Auto-Update möglich (z. B. beim Testen per python) oder mehrfach
        # gescheitert: wie bisher nur Bescheid geben.
        self._update_notified = True
        log.info("Neue Client-Version verfügbar: %s (aktuell: %s).", latest, CLIENT_VERSION)
        if self.on_update_available:
            self.on_update_available(latest)

    def _update_is_safe_now(self, now=None):
        """Nur aktualisieren, wenn kein Match läuft, nichts hochgeladen wird und
        keine angemeldete Runde gleich beginnt oder gerade läuft."""
        if self.tracker.state != MatchTracker.IDLE or self._uploading:
            return False
        now = now or datetime.now(timezone.utc)
        for starts_at in self.watch_rounds.values():
            if starts_at - UPDATE_QUIET_BEFORE_ROUND <= now <= starts_at + UPDATE_QUIET_AFTER_ROUND_START:
                return False
        return True

    def _apply_update(self, info, exe_path=None):
        """Neue .exe herunterladen, Prüfsumme vergleichen, gegen die laufende
        tauschen und neu starten. Unter Windows lässt sich eine laufende .exe
        nicht überschreiben, aber umbenennen: die alte wird zu *.exe.old, die
        neue bekommt genau ihren Namen (mit dem Kopplungscode darin) -- damit
        bleiben Verknüpfung und Autostart-Eintrag unverändert."""
        exe = Path(exe_path or sys.executable)
        expected = (info.get("sha256") or "").lower()
        size = info.get("size")
        if file_sha256(exe) == expected:
            # Die Server-Datei IST schon diese hier (Versionsnummer falsch
            # gepflegt) -- sonst würde der Client sich endlos neu laden.
            raise UpdateNotNeeded()
        part = exe.with_name(exe.name + ".update")
        old = exe.with_name(exe.name + ".old")
        try:
            self.api.download_update(info["updateUrl"], part, size)
            if size and part.stat().st_size != size:
                raise ValueError("Update-Datei unvollständig")
            if file_sha256(part) != expected:
                raise ValueError("Prüfsumme der Update-Datei stimmt nicht")
            if old.exists():
                old.unlink()
            os.replace(exe, old)
            try:
                os.replace(part, exe)
            except OSError:
                os.replace(old, exe)
                raise
        except BaseException:
            try:
                part.unlink()
            except OSError:
                pass
            raise
        log.info("Update auf %s installiert -- starte neu.", info.get("latestVersion"))
        try:
            self.restart_with(exe)
        except Exception:
            # Neue Datei ließ sich nicht starten: alte zurück, weiterlaufen.
            os.replace(exe, part)
            os.replace(old, exe)
            raise

    def _on_match_start(self, round_id):
        # Merkt sich den Stand VOR diesem Match, damit nachher zuverlässig nur
        # eine neu hinzugekommene Replay-Datei erkannt wird — nicht eine
        # ältere von einem früheren, unrelated Match.
        self._replay_baseline_mtime = _newest_replay_mtime()

    def _report_async(self, round_id, placement):
        # placement None = Team-Modus: nur das Replay zählt.
        if placement is not None:
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
            # Ohne Replay gibt es keine Kills und keine Lobby-Prüfung: einmal darauf
            # hinweisen, dass die Aufzeichnung in Fortnite vermutlich aus ist.
            if not self._no_replay_notified and self.on_notify:
                self._no_replay_notified = True
                self.on_notify(
                    "Keine Replay-Aufnahme gefunden",
                    "Bitte in Fortnite unter Einstellungen > Spiel > Wiederholungen "
                    "\"Wiederholungen aufzeichnen\" einschalten — sonst fehlen Kills und Platzierung.",
                )
            return

        # Warten, bis Fortnite die Aufnahme abgeschlossen hat (zurück in der
        # Lobby) -- eine noch laufende Replay ist nicht auswertbar.
        finalize_deadline = time.monotonic() + REPLAY_FINALIZE_WAIT_SECONDS
        while replay_is_live(found) is not False:
            if time.monotonic() >= finalize_deadline or not found.exists():
                log.info("Runde #%s: Replay-Aufnahme wurde nicht abgeschlossen — übersprungen.", round_id)
                return
            time.sleep(REPLAY_FINALIZE_POLL_SECONDS)

        try:
            self._upload_file(round_id, found)
        except AuthRevoked:
            self.stop_callback()

    def _upload_file(self, round_id, path):
        """Lädt eine fertige Replay-Datei genau einmal hoch (egal ob der Anstoß vom
        Log oder vom Replay-Wächter kommt). True = erledigt (hochgeladen oder vom
        Server endgültig abgelehnt), False = später noch einmal versuchen."""
        name = Path(path).name
        with self._upload_lock:
            if name in self._uploaded:
                return True
            if name in self._uploading:
                return False
            self._uploading.add(name)
        done = False
        try:
            started, confirmed = replay_start_info(path)
            hint = started if confirmed else None
            if not self._server_wants(round_id, path):
                log.info("Runde #%s: Replay %s wird nicht mehr gebraucht (Match ist schon ausgewertet).", round_id, name)
                done = True
                return done
            tracker = getattr(self, "tracker", None)
            res = self.api.upload_replay(round_id, Path(path), hint, tracker.epic_hint if tracker else None)
            if res.ok:
                log.info("Runde #%s: Replay-Datei hochgeladen (%s).", round_id, name)
                done = True
            elif 400 <= res.status_code < 500:
                # Endgültig (nicht angemeldet, Runde abgeschlossen, außerhalb des
                # Zeitfensters) -- erneut versuchen bringt nichts.
                log.warning("Runde #%s: Replay-Upload abgelehnt (%s): %s", round_id, res.status_code, res.text[:200])
                done = True
            else:
                log.warning("Runde #%s: Replay-Upload fehlgeschlagen (%s) — neuer Versuch folgt.", round_id, res.status_code)
        except (requests.exceptions.RequestException, OSError) as e:
            log.warning("Runde #%s: Replay-Upload fehlgeschlagen: %s — neuer Versuch folgt.", round_id, e)
        finally:
            with self._upload_lock:
                self._uploading.discard(name)
                if done and name not in self._uploaded:
                    self._uploaded.append(name)
                    save_uploaded_names(self._uploaded)
        return done

    def _server_wants(self, round_id, path):
        """Vorab-Frage an den Server (siehe ApiClient.replay_needed). Nur ein klares
        "nein" verhindert den Upload -- bei jedem Fehler oder einem älteren Server
        wird wie bisher einfach hochgeladen."""
        try:
            res = self.api.replay_needed(round_id, replay_length_ms(path))
            if res.ok and res.json().get("needed") is False:
                return False
        except AuthRevoked:
            raise
        except Exception:
            pass
        return True

    def _pick_watch_round(self, started):
        """Runde, in deren Zeitfenster ein Match mit diesem Beginn fällt (wie im
        MatchTracker: die zuletzt gestartete)."""
        candidates = [
            (starts, rid) for rid, starts in self.watch_rounds.items()
            if starts - MATCH_WINDOW_BEFORE <= started <= starts + MATCH_WINDOW_AFTER
        ]
        return max(candidates)[1] if candidates else None

    def scan_replays(self):
        """Ein Durchlauf des Replay-Wächters: lädt jede fertig aufgezeichnete, noch
        nicht hochgeladene Replay hoch, deren Match im Zeitfenster einer
        angemeldeten Runde begann. Gibt die Zahl der Uploads zurück."""
        if not self.watch_rounds:
            return 0
        try:
            files = sorted(FORTNITE_REPLAYS_DIR.glob("*.replay"))
        except OSError:
            return 0
        uploaded = 0
        for f in files:
            if f.name in self._uploaded:
                continue
            started = replay_started_at(f)
            if started is None:
                continue
            round_id = self._pick_watch_round(started)
            if round_id is None:
                continue
            if replay_is_live(f) is not False:
                continue  # Fortnite nimmt noch auf (oder Datei unlesbar) -- später wieder
            if self._upload_file(round_id, f):
                uploaded += 1
        return uploaded

    def watch_replays(self):
        while True:
            try:
                self.scan_replays()
            except AuthRevoked:
                self.stop_callback()
                return
            except Exception:
                log.exception("Unerwarteter Fehler im Replay-Wächter")
            time.sleep(REPLAY_WATCH_INTERVAL_SECONDS)

    def _report(self, round_id, placement):
        for attempt in range(1, REPORT_RETRIES + 1):
            try:
                res = self.api.report(round_id, placement, self.tracker.epic_hint)
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
                if res.status_code == 409 and "epic_mismatch" in res.text and self.on_notify:
                    self.on_notify(
                        "Ergebnis nicht gewertet",
                        "In Fortnite ist ein anderes Epic-Konto angemeldet als das, das mit ScrimPass "
                        "verknüpft ist. Prüf die Epic-Konto-ID in deinem ScrimPass-Profil.",
                    )
            return
        log.error("Runde #%s: Meldung nach %s Versuchen aufgegeben.", round_id, REPORT_RETRIES)

    def sync_rounds(self):
        """Aktiviert sich für alle zugesagten Runden, die noch nicht begonnen
        haben, und gibt dem Tracker die aktivierten Runden."""
        self._check_version()
        now = datetime.now(timezone.utc)
        armed = {}
        watch = {}
        tournament_rounds = set()
        team_rounds = set()
        for m in self.api.list_matches():
            starts_at = parse_server_time(m["startsAt"])
            # Der Replay-Wächter gilt für JEDE angemeldete Runde -- auch wenn die
            # Platzierung schon gemeldet ist oder der Client zu spät gestartet wurde.
            watch[m["id"]] = starts_at
            if (m.get("teamSize") or 1) > 1:
                team_rounds.add(m["id"])
            if m.get("tournamentId"):
                tournament_rounds.add(m["id"])
            elif m.get("reported"):
                continue
            if not m.get("checkedIn"):
                if now >= starts_at + CLIENT_LATE_ACTIVATION_GRACE:
                    continue  # zu spät gestartet: keine Platzierungsmeldung -- das Replay lädt der Wächter trotzdem hoch
                res = self.api.activate(m["id"])
                if not res.ok:
                    log.warning("Aktivierung Runde #%s fehlgeschlagen: %s", m["id"], res.text[:200])
                    continue
                log.info("Runde #%s aktiviert.", m["id"])
            armed[m["id"]] = starts_at
        self.watch_rounds = watch
        self.tracker.set_rounds(armed, tournament_rounds, team_rounds)

    def run(self):
        tailer = LogTailer(FORTNITE_LOG_PATH, self.tracker.feed_line, self.tracker.tick,
                           on_backlog=self.tracker.prime_epic_hint)
        tailer.start()
        threading.Thread(target=self.watch_replays, daemon=True).start()
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


def parse_version(text):
    try:
        return tuple(int(p) for p in str(text).strip().split("."))
    except ValueError:
        return None


def is_newer_version(latest, current):
    """True nur, wenn latest wirklich neuer ist (nie ein Downgrade, und eine
    unlesbare Versionsnummer löst nichts aus)."""
    a, b = parse_version(latest), parse_version(current)
    return bool(a and b) and a > b


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def can_self_update():
    """Nur die echte .exe unter Windows tauscht sich selbst aus."""
    return sys.platform == "win32" and bool(getattr(sys, "frozen", False))


def restart_with_new_exe(exe):
    """Startet die neue .exe als eigenständigen Prozess und beendet diesen."""
    env = {k: v for k, v in os.environ.items() if not (k.startswith("_PYI_") or k.startswith("_MEI"))}
    # Sonst würde die neue (PyInstaller-onefile-)Datei den entpackten Ordner
    # dieses Prozesses weiterbenutzen statt ihren eigenen.
    env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    subprocess.Popen([str(exe), "--after-update"], cwd=str(Path(exe).parent), env=env,
                     creationflags=flags, close_fds=True, stdin=subprocess.DEVNULL,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log.info("Neue Version gestartet, alte beendet sich.")
    logging.shutdown()
    os._exit(0)


def remove_old_exe(retries=20):
    """Räumt die beim Update beiseitegeschobene alte .exe weg (der alte
    Prozess braucht evtl. noch einen Moment, bis er ganz beendet ist)."""
    if not getattr(sys, "frozen", False):
        return
    old = Path(sys.executable).with_name(Path(sys.executable).name + ".old")
    for _ in range(retries):
        try:
            old.unlink()
            log.info("Alte Version entfernt.")
            return
        except FileNotFoundError:
            return
        except OSError:
            time.sleep(1)


def acquire_single_instance(wait_seconds=0):
    """wait_seconds > 0 nach einem Update: die alte Version gibt den Port erst
    frei, wenn sie sich beendet hat."""
    deadline = time.monotonic() + wait_seconds
    while True:
        guard = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            guard.bind(("127.0.0.1", SINGLE_INSTANCE_PORT))
            guard.listen(1)
            return guard
        except OSError:
            guard.close()
            if time.monotonic() >= deadline:
                return None
            time.sleep(0.5)


def own_file_name():
    return Path(sys.executable if getattr(sys, "frozen", False) else sys.argv[0]).name


AUTOSTART_REGISTRY_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
AUTOSTART_VALUE_NAME = "ScrimPassClient"


def enable_autostart():
    """Trägt den Client in den Windows-Autostart ein (HKEY_CURRENT_USER, kein
    Admin-Recht nötig), damit Spieler ihn nicht vor jeder Runde von Hand
    starten müssen -- genau das hat schon zu verpassten Aktivierungen
    geführt. Nur relevant für die echte .exe (PyInstaller) unter Windows;
    beim Testen per `python scrimpass_client.py` ist sys.executable der
    Python-Interpreter, das wäre als Autostart-Eintrag sinnlos."""
    if sys.platform != "win32" or not getattr(sys, "frozen", False):
        return
    try:
        import winreg
        exe_path = f'"{sys.executable}"'
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_REGISTRY_PATH, 0, winreg.KEY_SET_VALUE)
        try:
            winreg.SetValueEx(key, AUTOSTART_VALUE_NAME, 0, winreg.REG_SZ, exe_path)
        finally:
            winreg.CloseKey(key)
        log.info("Windows-Autostart eingerichtet: %s", exe_path)
    except Exception:
        log.exception("Windows-Autostart konnte nicht eingerichtet werden")


def disable_autostart():
    """Entfernt den Autostart-Eintrag wieder -- aufgerufen, wenn der Client in
    ScrimPass getrennt wird (dann würde er beim nächsten Windows-Start ohnehin
    nur noch die Fehlermeldung "keinem Konto zugeordnet" zeigen)."""
    if sys.platform != "win32":
        return
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_REGISTRY_PATH, 0, winreg.KEY_SET_VALUE)
        try:
            winreg.DeleteValue(key, AUTOSTART_VALUE_NAME)
        except FileNotFoundError:
            pass
        finally:
            winreg.CloseKey(key)
    except Exception:
        log.exception("Windows-Autostart konnte nicht entfernt werden")


def pair(server, code):
    label = os.environ.get("COMPUTERNAME") or socket.gethostname()
    data = ApiClient(server).pair_exchange(code, label)
    # paired_code wird gemerkt, damit main() bei jedem Start erkennen kann, ob
    # die gerade laufende .exe einen ANDEREN (frisch heruntergeladenen) Code
    # im Dateinamen trägt als beim letzten Pairing -- nur dann lohnt sich ein
    # erneuter Pairing-Versuch (siehe main()).
    cfg = {"api_base": server, "token": data["token"], "username": data.get("username", ""), "paired_code": code}
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
    parser.add_argument("--after-update", action="store_true")
    args, _ = parser.parse_known_args()

    setup_logging()
    guard = acquire_single_instance(wait_seconds=30 if args.after_update else 0)
    if guard is None:
        return 0  # läuft bereits
    if args.after_update:
        log.info("Auf Version %s aktualisiert.", CLIENT_VERSION)
    threading.Thread(target=remove_old_exe, daemon=True).start()

    cfg = load_config()

    # Code/Server kommen aus der Kommandozeile oder (der Normalfall) aus dem
    # Dateinamen dieser .exe -- jeder Download auf der SP-Client-Seite bettet
    # einen frischen, einmaligen Code ein. Ein Code, der vom zuletzt
    # gespeicherten abweicht, ist das eindeutige Signal "das hier ist eine neu
    # heruntergeladene Datei, die Verbindung soll (neu) hergestellt werden" --
    # das greift auch dann, wenn schon ein alter Token für ein ANDERES Konto
    # gespeichert war, damit ein Kontowechsel einfach per Neu-Herunterladen
    # funktioniert, ohne von Hand die gespeicherte Konfiguration löschen zu
    # müssen.
    server, code = args.server, args.code
    if not (server and code):
        parsed = parse_download_name(own_file_name())
        if parsed:
            code, server = parsed
    is_new_download = bool(code) and code != cfg.get("paired_code")

    if not cfg.get("token") or is_new_download:
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
            if cfg.get("token"):
                # Vermutlich nur ein normaler Neustart mit einem Code, der
                # inzwischen schon verbraucht ist (oder Server kurz nicht
                # erreichbar) -- der bestehende Token bleibt einfach gültig,
                # kein Grund, deswegen laut zu werden.
                log.info("Erneutes Pairing übersprungen (%s) -- bestehender Token bleibt aktiv.", e)
            else:
                log.error("Verbindung fehlgeschlagen: %s", e)
                show_error(
                    "Die Verbindung mit ScrimPass ist fehlgeschlagen.\n\n"
                    "Der Download-Code ist abgelaufen oder wurde schon verwendet, oder ScrimPass "
                    "ist nicht erreichbar. Bitte lade den Client auf der Seite \"SP-Client\" "
                    "erneut herunter."
                )
                return 1

    enable_autostart()

    def on_revoked():
        log.warning("Client wurde in ScrimPass getrennt — beende mich.")
        try:
            CONFIG_PATH.unlink()
        except FileNotFoundError:
            pass
        disable_autostart()
        os._exit(0)  # beendet auch den Tray-Icon-Thread sofort mit

    # Die eigentliche Arbeit (Log verfolgen, Runden synchronisieren, melden)
    # läuft im Hintergrund-Thread weiter -- der Hauptthread wird für das
    # Tray-Icon gebraucht (icon.run() blockiert, bis "Beenden" geklickt wird).
    tray_icon = None

    def notify_update(latest_version):
        if tray_icon is None:
            return
        try:
            tray_icon.notify(
                f"Neue Version ({latest_version}) verfügbar — sie konnte nicht automatisch "
                "installiert werden. Bitte auf der SP-Client-Seite in ScrimPass neu herunterladen.",
                "ScrimPass-Update verfügbar",
            )
        except Exception:
            pass

    def notify(title, text):
        if tray_icon is None:
            return
        try:
            tray_icon.notify(text, title)
        except Exception:
            pass

    service = Service(ApiClient(cfg["api_base"], cfg["token"]), on_revoked,
                      on_update_available=notify_update, on_notify=notify)
    threading.Thread(target=service.run, daemon=True).start()

    tray_icon = build_tray_icon(cfg, on_quit=lambda: None)
    if args.after_update:
        def announce_update():
            time.sleep(5)  # bis das Tray-Symbol sichtbar ist
            notify("ScrimPass-Client aktualisiert",
                   f"Version {CLIENT_VERSION} ist installiert und läuft. Du musst nichts tun.")
        threading.Thread(target=announce_update, daemon=True).start()
    tray_icon.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
