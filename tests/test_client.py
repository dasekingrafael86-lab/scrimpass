"""Tests für die Log-Auswertung des SP-Clients (MatchTracker) -- mit Zeilen im
Format eines echten FortniteGame.log (Oktober 2026, deutsch)."""
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

for _mod in ("pystray", "PIL", "PIL.Image", "PIL.ImageDraw"):
    sys.modules.setdefault(_mod, types.ModuleType(_mod))
sys.modules["PIL"].Image = sys.modules["PIL.Image"]
sys.modules["PIL"].ImageDraw = sys.modules["PIL.ImageDraw"]
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "client"))
import scrimpass_client as C  # noqa: E402

START = "LogFort: MatchState changed previous=WaitingToStart current=InProgress"
PLACED = "LogFortPostGamePlacementOverlay: UPostGamePlacementOverlay::LocalPlacementChanged We now have placement for the local player."


def presence(mode, n, word="übrig"):
    return f"LogEOSSDK: LogEOSPresence: Updating Presence to [Online]. LocalUserId=[e7d...71f] Template=[] RichText=[Battle Royale Build Unranked {mode} – {n} {word}]"


@pytest.fixture
def tracker():
    now = [datetime(2026, 10, 13, 16, 6, tzinfo=timezone.utc)]
    results = []
    t = C.MatchTracker(lambda rid, pl: results.append((rid, pl)), clock=lambda: now[0])
    t.set_rounds({7: now[0]})
    return t, results


@pytest.mark.parametrize("word", ["übrig", "remaining"])
def test_solo_reports_first_count_after_elimination(tracker, word):
    t, results = tracker
    for line in (START, presence("Solo", 98, word), PLACED, presence("Solo", 68, word), presence("Solo", 40, word)):
        t.feed_line(line)
    assert results == [(7, 68)]


def test_duo_reports_no_placement_only_replay(tracker):
    t, results = tracker
    for line in (START, presence("Duo", 100), PLACED, presence("Duo", 70)):
        t.feed_line(line)
    assert results == [(7, None)]


def test_trio_and_squads_detected_as_team_modes(tracker):
    t, results = tracker
    for line in (START, presence("Trios", 99), PLACED, presence("Trios", 61)):
        t.feed_line(line)
    assert results == [(7, None)]
    assert C.TEAM_MODE_RE.search(presence("Squads", 12)) and not C.TEAM_MODE_RE.search(presence("Solo", 12))


def test_team_round_from_the_server_reports_no_placement_even_without_mode_in_the_text():
    # Custom-Match: der Präsenz-Text nennt kein "Duo" -- die Teamgröße kommt vom Server.
    now = datetime(2026, 11, 20, 18, 0, tzinfo=timezone.utc)
    results = []
    t = C.MatchTracker(lambda rid, pl: results.append((rid, pl)), clock=lambda: now)
    t.set_rounds({7: now}, team_rounds={7})
    for line in (START, presence("Benutzerdefiniert", 40), PLACED, presence("Benutzerdefiniert", 38)):
        t.feed_line(line)
    assert results == [(7, None)]


def test_next_match_is_tracked_even_if_the_previous_one_never_ended_cleanly():
    # Spiel 1 endet ohne Platzierungs-Zeile (Absturz, verlassen, Sieg): Spiel 2 darf
    # trotzdem nicht verloren gehen, und der Zwischenstand aus Spiel 1 zählt nicht.
    base = datetime(2026, 11, 20, 18, 0, tzinfo=timezone.utc)
    now = [base + timedelta(minutes=1)]
    results = []
    t = C.MatchTracker(lambda rid, pl: results.append((rid, pl)), clock=lambda: now[0])
    t.set_rounds({1: base, 2: base + timedelta(minutes=35)}, tournament_rounds={1, 2})
    for line in (START, presence("Solo", 98), presence("Solo", 3)):
        t.feed_line(line)
    now[0] = base + timedelta(minutes=36)
    t.feed_line(START)
    assert results == [(1, None)]                      # nur Replay für Spiel 1
    assert t.state == t.IN_MATCH and t.current_round == 2
    for line in (presence("Solo", 50), PLACED, presence("Solo", 12)):
        t.feed_line(line)
    assert results == [(1, None), (2, 12)]


def test_unconfirmed_count_is_not_reported_when_the_next_map_loads(tracker):
    t, results = tracker
    for line in (START, presence("Solo", 98), presence("Solo", 7),
                 "LogFort: MatchState changed previous=EnteringMap current=WaitingToStart"):
        t.feed_line(line)
    assert results == [(7, None)]


def test_every_request_carries_the_client_version(monkeypatch):
    sent = {}

    class _Session:
        def request(self, method, url, headers=None, **kw):
            sent.update(headers or {})
            return types.SimpleNamespace(status_code=200)

    api = C.ApiClient("https://example.test", token="t")
    api.http = _Session()
    api._request("GET", "/api/client/matches")
    assert sent[C.CLIENT_VERSION_HEADER] == C.CLIENT_VERSION and sent["Authorization"] == "Bearer t"


def test_back_to_back_tournament_games_pick_the_latest_started_game():
    # Spiel 1 um 17:30, Spiel 2 um 18:05 (35 min Abstand). Ein verspätetes Spiel 1
    # (Start 17:50) gehört zu Spiel 1, obwohl 18:05 zeitlich näher liegt.
    base = datetime(2026, 11, 18, 16, 30, tzinfo=timezone.utc)
    now = [base + timedelta(minutes=20)]
    t = C.MatchTracker(lambda rid, pl: None, clock=lambda: now[0])
    t.set_rounds({1: base, 2: base + timedelta(minutes=35), 3: base + timedelta(minutes=70)})
    assert t._pick_round(now[0]) == 1
    now[0] = base + timedelta(minutes=36)   # Spiel 2 läuft
    assert t._pick_round(now[0]) == 2
    now[0] = base + timedelta(minutes=66)   # 4 min vor Spiel 3: Bus von Spiel 3
    assert t._pick_round(now[0]) == 3


def test_tournament_game_stays_armed_after_a_report_and_replay_uploads_without_placement():
    base = datetime(2026, 11, 18, 16, 30, tzinfo=timezone.utc)
    now = [base + timedelta(minutes=1)]
    results = []
    t = C.MatchTracker(lambda rid, pl: results.append((rid, pl)), clock=lambda: now[0])
    t.set_rounds({1: base, 2: base + timedelta(minutes=35)}, tournament_rounds={1, 2})
    for line in (START, presence("Solo", 98), PLACED, presence("Solo", 68)):
        t.feed_line(line)
    assert results == [(1, 68)]
    # Spiel 2 startet verspätet erst nach 18:40 -> zeitlich wieder "Spiel 2"; und selbst wenn der
    # Client dasselbe Spiel noch einmal wählt, bleibt es aktiv (der Server ordnet zu).
    t.set_rounds({1: base, 2: base + timedelta(minutes=35)}, tournament_rounds={1, 2})
    now[0] = base + timedelta(minutes=20)
    t.feed_line(START)
    assert t.current_round == 1
    # Match endet ohne erkannte Platzierung -> trotzdem Replay-Upload (placement None)
    t.feed_line("LogFort: MatchState changed previous=EnteringMap current=WaitingToStart")
    assert results[-1] == (1, None)


# ---------------------------------------------------------------------------
# Replay-Wächter: lädt fertige Replays unabhängig vom Log hoch
# ---------------------------------------------------------------------------
import struct


def _replay_bytes(live):
    return (struct.pack("<IIiIII", 0x1CA2E27F, 7, 0, 1000, 1, 1) + struct.pack("<i", 0)
            + struct.pack("<I", 1 if live else 0) + b"\0" * 64)


class _FakeApi:
    def __init__(self, status=200):
        self.status = status
        self.uploads = []
        self.asked = []
        self.needed = True          # Antwort auf die Vorab-Frage; None = Server kennt sie nicht (alt)

    def replay_needed(self, round_id, length_ms=None):
        self.asked.append((round_id, length_ms))
        if self.needed is None:
            return types.SimpleNamespace(ok=False, status_code=404, text="", json=lambda: {})
        if isinstance(self.needed, Exception):
            raise self.needed
        return types.SimpleNamespace(ok=True, status_code=200, text="", json=lambda: {"needed": self.needed})

    def upload_replay(self, round_id, path, started_at=None, epic_hint=None, info=None, identity=None):
        self.started = started_at
        self.epic_hint = epic_hint
        self.info = info
        self.identity = identity
        self.uploads.append((round_id, path.name))
        return types.SimpleNamespace(ok=self.status < 400, status_code=self.status, text="")


def _local_name(dt_utc):
    return "UnsavedReplay-" + dt_utc.astimezone().strftime("%Y.%m.%d-%H.%M.%S") + ".replay"


@pytest.fixture
def watcher(tmp_path, monkeypatch):
    monkeypatch.setattr(C, "FORTNITE_REPLAYS_DIR", tmp_path / "Demos")
    monkeypatch.setattr(C, "APP_DIR", tmp_path / "app")
    monkeypatch.setattr(C, "UPLOADED_PATH", tmp_path / "app" / "uploaded_replays.json")
    (tmp_path / "Demos").mkdir()
    api = _FakeApi()
    return C.Service(api, lambda: None), api, tmp_path / "Demos"


def test_replay_start_time_comes_from_the_file_name():
    start = datetime(2026, 11, 18, 16, 31, 5, tzinfo=timezone.utc)
    assert C.replay_started_at(_local_name(start)) == start


def test_match_start_is_only_confirmed_when_file_name_and_file_time_agree():
    start = datetime(2026, 11, 18, 16, 31, 5, tzinfo=timezone.utc)
    local_name_time = start.astimezone().replace(tzinfo=None)      # so steht es im Dateinamen (Ortszeit)
    pick = C.pick_replay_start
    # Datei wurde im selben Moment angelegt -> bestätigt
    assert pick(local_name_time, start + timedelta(seconds=2), start) == (start, True)
    # kopierte Datei (viel später angelegt) -> beste Schätzung, aber unbestätigt
    assert pick(local_name_time, start + timedelta(hours=3, minutes=17), start) == (start, False)
    # stünde der Dateiname in Weltzeit, wird das am Abgleich erkannt
    assert pick(start.replace(tzinfo=None), start + timedelta(seconds=2), start) == (start, True)
    # umbenannte Datei: nur die Dateizeit, unbestätigt
    assert pick(None, start, start - timedelta(minutes=1)) == (start - timedelta(minutes=1), False)
    assert pick(None, None, None) == (None, False)


def test_replay_length_is_read_from_the_header(tmp_path):
    f = tmp_path / "a.replay"
    f.write_bytes(_replay_bytes(live=False))
    assert C.replay_length_ms(f) == 1000
    f.write_bytes(b"kein replay")
    assert C.replay_length_ms(f) is None
    assert C.replay_length_ms(tmp_path / "fehlt.replay") is None


def test_watcher_uploads_finished_replays_of_registered_rounds_once(watcher):
    service, api, demos = watcher
    start = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=20)
    service.watch_rounds = {7: start}
    in_window = demos / _local_name(start + timedelta(minutes=3))
    still_live = demos / _local_name(start + timedelta(minutes=4))
    too_early = demos / _local_name(start - timedelta(minutes=30))
    in_window.write_bytes(_replay_bytes(live=False))
    still_live.write_bytes(_replay_bytes(live=True))
    too_early.write_bytes(_replay_bytes(live=False))
    assert service.scan_replays() == 1
    assert api.uploads == [(7, in_window.name)]
    # Die Datei wurde eben erst angelegt, ihr Name nennt aber eine ältere Uhrzeit
    # (wie bei einer kopierten Datei): kein bestätigter Matchbeginn -> kein Hinweis.
    assert api.started is None
    assert api.asked == [(7, 1000)]                    # vor dem Upload wird der Server gefragt
    assert service.scan_replays() == 0                 # nichts doppelt
    still_live.write_bytes(_replay_bytes(live=False))  # Fortnite hat die Aufnahme abgeschlossen
    assert service.scan_replays() == 1
    assert [u[1] for u in api.uploads] == [in_window.name, still_live.name]
    # nach einem Neustart weiß der Client noch, was schon hochgeladen ist
    again = C.Service(_FakeApi(), lambda: None)
    again.watch_rounds = {7: start}
    assert again.scan_replays() == 0


def test_watcher_picks_latest_started_game_and_retries_after_server_errors(watcher):
    service, api, demos = watcher
    base = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=50)
    service.watch_rounds = {1: base, 2: base + timedelta(minutes=35)}
    f = demos / _local_name(base + timedelta(minutes=37))
    f.write_bytes(_replay_bytes(live=False))
    api.status = 502
    assert service.scan_replays() == 0 and api.uploads == [(2, f.name)]   # Serverfehler -> später erneut
    api.status = 200
    assert service.scan_replays() == 1 and api.uploads[-1] == (2, f.name)


def test_log_triggered_upload_and_watcher_never_upload_the_same_file_twice(watcher):
    service, api, demos = watcher
    start = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=10)
    service.watch_rounds = {7: start}
    f = demos / _local_name(start + timedelta(minutes=1))
    f.write_bytes(_replay_bytes(live=False))
    assert service._upload_file(7, f) is True          # Anstoß vom Log
    assert service.scan_replays() == 0                 # Wächter überspringt die Datei
    assert len(api.uploads) == 1


def test_confirmed_match_start_is_sent_with_the_upload(watcher):
    service, api, demos = watcher
    now = datetime.now(timezone.utc).replace(microsecond=0)
    service.watch_rounds = {7: now - timedelta(minutes=2)}
    f = demos / _local_name(now)                       # Name und Anlegezeit der Datei passen zusammen
    f.write_bytes(_replay_bytes(live=False))
    assert service.scan_replays() == 1
    assert api.started == now
    assert api.asked == [(7, 1000)]


def test_replay_the_server_no_longer_needs_is_not_uploaded(watcher):
    service, api, demos = watcher
    start = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=10)
    service.watch_rounds = {7: start}
    f = demos / _local_name(start + timedelta(minutes=1))
    f.write_bytes(_replay_bytes(live=False))
    api.needed = False
    assert service.scan_replays() == 1                 # erledigt ...
    assert api.uploads == []                           # ... ohne Upload
    api.needed = True
    assert service.scan_replays() == 0                 # und wird nicht erneut angefasst


@pytest.mark.parametrize("answer", [None, RuntimeError("keine Verbindung")])
def test_upload_happens_when_the_server_cannot_answer_the_question(watcher, answer):
    service, api, demos = watcher
    start = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=10)
    service.watch_rounds = {7: start}
    f = demos / _local_name(start + timedelta(minutes=1))
    f.write_bytes(_replay_bytes(live=False))
    api.needed = answer                                # älterer Server (404) bzw. Fehler bei der Frage
    assert service.scan_replays() == 1
    assert api.uploads == [(7, f.name)]


def test_upload_sends_match_start_and_current_time_of_this_pc(tmp_path):
    api = C.ApiClient("https://example.invalid", token="t")
    sent = {}

    def fake_request(method, path, **kwargs):
        sent.update(method=method, path=path, data=kwargs.get("data"), json=kwargs.get("json"))
        return types.SimpleNamespace(ok=True, status_code=200, text="")

    api._request = fake_request
    f = tmp_path / "a.replay"
    f.write_bytes(_replay_bytes(live=False))
    start = datetime(2026, 11, 18, 16, 31, 5, tzinfo=timezone.utc)
    api.upload_replay(7, f, start)
    assert sent["path"] == "/api/client/matches/7/replay"
    assert sent["data"]["startedAt"] == start.isoformat()
    assert abs((datetime.fromisoformat(sent["data"]["sentAt"]) - datetime.now(timezone.utc)).total_seconds()) < 5
    api.upload_replay(7, f)                            # ohne bestätigten Beginn: keine Zeitangaben
    assert sent["data"] is None
    api.replay_needed(7, 1000)
    assert sent["path"] == "/api/client/matches/7/replay-needed" and sent["json"] == {"lengthMs": 1000}
    api.replay_needed(7)
    assert sent["json"] == {}


def test_epic_account_from_the_log_is_remembered(tracker):
    t, _results = tracker
    assert t.epic_hint is None
    t.feed_line(presence("Solo", 99))                  # LocalUserId=[e7d...71f]
    assert t.epic_hint == "e7d...71f"
    t.feed_line("LogEOSSDK: LogEOSPresence: Updating Presence to [Online]. LocalUserId=[ABC...DEF] Template=[]")
    assert t.epic_hint == "abc...def"                   # anderes Konto angemeldet -> neuer Stand


def test_report_and_upload_send_the_epic_account_from_the_log(tmp_path):
    api = C.ApiClient("https://example.invalid", token="t")
    sent = {}

    def fake_request(method, path, **kwargs):
        sent.update(path=path, data=kwargs.get("data"), json=kwargs.get("json"))
        return types.SimpleNamespace(ok=True, status_code=200, text="")

    api._request = fake_request
    api.report(7, 3, "e7d...71f")
    assert sent["json"] == {"placement": 3, "epicIdHint": "e7d...71f"}
    api.report(7, 3)
    assert sent["json"] == {"placement": 3}
    f = tmp_path / "a.replay"
    f.write_bytes(_replay_bytes(live=False))
    api.upload_replay(7, f, None, "e7d...71f")
    assert sent["data"] == {"epicIdHint": "e7d...71f"}


def test_only_the_presence_line_names_the_epic_account(tracker):
    """Andere EOS-Zeilen können unter LocalUserId eine andere Art von Kennung führen --
    eine falsch gelesene Kennung würde das Ergebnis eines ehrlichen Spielers entwerten."""
    t, _results = tracker
    t.feed_line("LogEOSSDK: LogEOSRTC: Joined room. LocalUserId=[000...abc] RoomName=[x]")
    t.feed_line("LogEOSSDK: LogEOSConnect: Login. LocalUserId=[00021234567890abcdef1234567890ab]")
    assert t.epic_hint is None
    t.feed_line(presence("Solo", 80))
    assert t.epic_hint == "e7d...71f"
    t.feed_line("LogEOSSDK: LogEOSRTC: Left room. LocalUserId=[000...abc]")
    assert t.epic_hint == "e7d...71f"


def test_epic_account_is_known_right_after_start_from_the_existing_log(tmp_path, monkeypatch):
    log_file = tmp_path / "FortniteGame.log"
    old = "LogEOSSDK: LogEOSPresence: Updating Presence to [Online]. LocalUserId=[aaa...111] Template=[]\n"
    filler = "LogFort: irgendeine andere Zeile\n" * 200
    last = "LogEOSSDK: LogEOSPresence: Updating Presence to [Online]. LocalUserId=[E7D...71F] Template=[]\n"
    log_file.write_text(old + filler + last + filler, encoding="utf-8")
    t = C.MatchTracker(lambda rid, pl: None)
    tailer = C.LogTailer(log_file, t.feed_line, t.tick, on_backlog=t.prime_epic_hint)
    tailer._read_backlog()
    assert t.epic_hint == "e7d...71f"                   # das zuletzt genannte Konto
    # Ein schon live gelesenes Konto wird vom alten Log nicht überschrieben.
    t.epic_hint = "bbb...222"
    tailer._read_backlog()
    assert t.epic_hint == "bbb...222"
    # Nur das Ende großer Logs wird gelesen.
    monkeypatch.setattr(C, "LOG_BACKLOG_BYTES", len(filler) // 2)
    t2 = C.MatchTracker(lambda rid, pl: None)
    C.LogTailer(log_file, t2.feed_line, t2.tick, on_backlog=t2.prime_epic_hint)._read_backlog()
    assert t2.epic_hint is None
    # Fehlt die Datei, passiert nichts.
    C.LogTailer(tmp_path / "gibt-es-nicht.log", t2.feed_line, t2.tick, on_backlog=t2.prime_epic_hint)._read_backlog()


# --- Auto-Update ------------------------------------------------------------

import hashlib  # noqa: E402


class _UpdateApi:
    def __init__(self, new_bytes, latest="9.9.9", sha=None, size=None):
        self.new_bytes = new_bytes
        self.latest = latest
        self.sha = sha or hashlib.sha256(new_bytes).hexdigest()
        self.size = len(new_bytes) if size is None else size
        self.downloads = 0

    def info(self):
        return {"latestVersion": self.latest, "sha256": self.sha, "size": self.size,
                "updateUrl": "/api/client/update/download"}

    def download_update(self, url, dest, expected_size):
        self.downloads += 1
        Path(dest).write_bytes(self.new_bytes)


@pytest.fixture
def updater(tmp_path, monkeypatch):
    monkeypatch.setattr(C, "APP_DIR", tmp_path / "app")
    monkeypatch.setattr(C, "UPLOADED_PATH", tmp_path / "app" / "uploaded_replays.json")
    exe = tmp_path / "ScrimPassClient_ABC123_scrimpass.com.exe"
    exe.write_bytes(b"alte version")

    def make(api):
        notified = []
        s = C.Service(api, lambda: None, on_update_available=notified.append)
        s.can_self_update = True
        s.restarted = []
        s.restart_with = s.restarted.append
        s._next_version_check = 0
        monkeypatch.setattr(C.sys, "executable", str(exe))
        return s, notified
    return make, exe


def test_versions_are_compared_as_numbers_and_never_downgrade():
    assert C.is_newer_version("1.0.10", "1.0.9")
    assert C.is_newer_version("1.1", "1.0.4")
    assert not C.is_newer_version("1.0.3", "1.0.4")
    assert not C.is_newer_version("1.0.4", "1.0.4")
    assert not C.is_newer_version("kaputt", "1.0.4")


def test_update_replaces_the_exe_under_the_same_name_and_restarts(updater):
    make, exe = updater
    service, notified = make(_UpdateApi(b"neue version"))
    service._check_version()
    assert exe.read_bytes() == b"neue version"           # gleicher Dateiname -> Kopplung bleibt
    assert exe.with_name(exe.name + ".old").read_bytes() == b"alte version"
    assert service.restarted == [exe] and notified == []


def test_update_with_wrong_checksum_keeps_the_old_exe(updater):
    make, exe = updater
    api = _UpdateApi(b"manipuliert", sha="0" * 64)
    service, notified = make(api)
    for _ in range(C.UPDATE_MAX_ATTEMPTS):
        service._next_version_check = 0
        service._check_version()
    assert exe.read_bytes() == b"alte version"
    assert not exe.with_name(exe.name + ".update").exists()
    assert service.restarted == [] and api.downloads == C.UPDATE_MAX_ATTEMPTS
    assert notified == ["9.9.9"]                          # danach wie bisher: Hinweis im Tray


def test_failed_restart_puts_the_old_exe_back(updater):
    make, exe = updater
    service, _ = make(_UpdateApi(b"neue version"))

    def broken(path):
        raise OSError("lässt sich nicht starten")
    service.restart_with = broken
    service._check_version()
    assert exe.read_bytes() == b"alte version"


def test_no_update_while_a_round_is_about_to_start_or_running(updater):
    make, exe = updater
    api = _UpdateApi(b"neue version")
    service, _ = make(api)
    now = datetime.now(timezone.utc)
    for starts_at in (now + timedelta(minutes=10), now - timedelta(minutes=30)):
        service.watch_rounds = {1: starts_at}
        service._next_version_check = 0
        service._check_version()
        assert api.downloads == 0 and exe.read_bytes() == b"alte version"
    service.watch_rounds = {1: now + timedelta(hours=3)}
    service.tracker.state = C.MatchTracker.IN_MATCH       # Fortnite-Match läuft
    service._next_version_check = 0
    service._check_version()
    assert api.downloads == 0
    service.tracker.state = C.MatchTracker.IDLE
    service._next_version_check = 0
    service._check_version()
    assert exe.read_bytes() == b"neue version"


def test_no_endless_update_when_the_server_file_is_this_exe(updater):
    make, exe = updater
    api = _UpdateApi(b"alte version")                    # Versionsnummer falsch gepflegt
    service, notified = make(api)
    service._check_version()
    service._next_version_check = 0
    service._check_version()
    assert api.downloads == 0 and service.restarted == [] and notified == []


def test_python_test_runs_only_notify(updater):
    make, exe = updater
    api = _UpdateApi(b"neue version")
    service, notified = make(api)
    service.can_self_update = False
    service._check_version()
    assert api.downloads == 0 and notified == ["9.9.9"]


# ---------------------------------------------------------------------------
# Lobby (Session), Playlist und Epic-Konto aus dem Log -- Zeilen aus echten Logs (19.11.2026)
# ---------------------------------------------------------------------------
def browse(sid):
    return f"[2026.11.19-14.27.29:704][821]LogNet: Browse: 18.156.252.247:9003/Game/Maps/Frontend?EncryptionToken=e7d9869b0e494a4f853b98d0519ac71f:{sid}"


LATE_START = "[2026.11.19-14.27.37:244][922]LogFort: MatchState changed previous=EnteringMap current=InProgress"
PLAYLIST = '[2026.11.19-14.27.37:245][922]LogCsvProfiler: Display: Metadata set : playlistid="Playlist_HabaneroSolo"'
LOGIN = ("[2026.11.19-21.30.59:345][715]LogOnlineAccount: Display: [OnlineAccount:index=2:uid=0][process_user_login] "
         "Successfully logged in user. UserId=[e7d9869b0e494a4f853b98d0519ac71f] DisplayName=[kungfuRAFI] EpicAccountId=[MCP:e7d]")
S1, S2 = "fbe7d17242564a82a2883c42d7ce9ea8", "c929fe8d9d254b7d9497c7dbd3dcb329"


def _info_tracker():
    now = [datetime(2026, 11, 19, 14, 27, tzinfo=timezone.utc)]
    out = []
    t = C.MatchTracker(None, clock=lambda: now[0], on_result_info=lambda rid, pl, info: out.append((rid, pl, dict(info))))
    t.set_rounds({7: now[0]}, tournament_rounds={7})
    return t, out, now


def test_late_join_into_running_warmup_is_tracked_with_session_and_playlist():
    t, out, _ = _info_tracker()
    for line in (browse(S1), LATE_START, PLAYLIST, presence("Solo", 55), PLACED, presence("Solo", 47)):
        t.feed_line(line)
    assert [(r, p, i["sessionId"], i["playlist"]) for r, p, i in out] == [(7, 47, S1, "Playlist_HabaneroSolo")]


def test_reconnect_to_the_same_lobby_keeps_tracking():
    t, out, _ = _info_tracker()
    for line in (browse(S1), LATE_START, presence("Solo", 60), browse(S1), LATE_START, PLACED, presence("Solo", 20)):
        t.feed_line(line)
    assert [(p, i["sessionId"]) for _, p, i in out] == [(20, S1)]


def test_switching_to_another_server_ends_the_old_match():
    t, out, _ = _info_tracker()
    for line in (browse(S1), LATE_START, presence("Solo", 60), browse(S2), START, PLACED, presence("Solo", 9)):
        t.feed_line(line)
    assert [(p, i["sessionId"]) for _, p, i in out] == [(None, S1), (9, S2)]


def test_duo_playlist_means_team_mode():
    t, out, _ = _info_tracker()
    for line in (browse(S1), START, PLAYLIST.replace("HabaneroSolo", "DefaultDuo"), presence("", 90), PLACED, presence("", 40)):
        t.feed_line(line)
    assert [p for _, p, _ in out] == [None]


def test_login_line_gives_full_epic_id_and_display_name_and_replay_finds_its_session():
    t, out, now = _info_tracker()
    t.prime_epic_hint(LOGIN + "\n")
    assert t.identity() == {"epicAccountId": "e7d9869b0e494a4f853b98d0519ac71f", "epicDisplayName": "kungfuRAFI"}
    for line in (browse(S1), LATE_START):
        t.feed_line(line)
    assert t.info_for_replay(now[0] + timedelta(seconds=40))["sessionId"] == S1
    assert t.info_for_replay(now[0] + timedelta(minutes=10)) is None


def test_report_and_upload_carry_session_and_identity(tmp_path):
    sent = []

    class _Http:
        def request(self, method, url, headers=None, **kw):
            sent.append((url, kw.get("json"), kw.get("data")))
            return types.SimpleNamespace(status_code=200, ok=True)

    api = C.ApiClient("https://x")
    api.http = _Http()
    info = {"sessionId": S1, "playlist": "Playlist_HabaneroSolo", "startedAt": datetime.now(timezone.utc)}
    ident = {"epicAccountId": "e7d9869b0e494a4f853b98d0519ac71f", "epicDisplayName": "kungfuRAFI"}
    api.report(7, 3, "e7d...71f", info, ident)
    api.report_session(7, info, ident)
    f = tmp_path / "a.replay"
    f.write_bytes(b"x")
    api.upload_replay(7, f, None, None, info, ident)
    assert sent[0][0].endswith("/7/report") and sent[0][1]["sessionId"] == S1 and sent[0][1]["epicDisplayName"] == "kungfuRAFI"
    assert sent[1][0].endswith("/7/session") and sent[1][1]["playlist"] == "Playlist_HabaneroSolo"
    assert sent[2][2]["sessionId"] == S1 and sent[2][2]["epicAccountId"] == ident["epicAccountId"]

@pytest.mark.parametrize("match", [
    {"id": 7, "mode": "Solo Reload", "teamSize": 1, "reload": True},
    {"id": 7, "mode": "Solo Reload", "teamSize": 1},                  # älterer Server ohne "reload"-Feld
    {"id": 7, "mode": "Nosam Turnier", "teamSize": 1, "reload": True},
])
def test_reload_round_reports_no_placement_from_the_log(watcher, match):
    """Bei Reload kann man ausscheiden und per Respawn zurückkommen -- die Platzierung
    kommt aus dem Replay, nicht aus dem Log."""
    service, api, demos = watcher
    now = datetime.now(timezone.utc).replace(microsecond=0)
    api.list_matches = lambda: [dict(match, startsAt=now.strftime("%Y-%m-%d %H:%M:%S"), checkedIn=True, tournamentId=None, reported=False)]
    service._check_version = lambda: None
    service.sync_rounds()
    assert 7 in service.tracker.team_rounds


def test_battle_royale_solo_round_still_reports_placement(watcher):
    service, api, demos = watcher
    now = datetime.now(timezone.utc).replace(microsecond=0)
    api.list_matches = lambda: [{"id": 8, "mode": "Solo Battle Royale", "teamSize": 1, "reload": False,
                                 "startsAt": now.strftime("%Y-%m-%d %H:%M:%S"), "checkedIn": True, "tournamentId": None, "reported": False}]
    service._check_version = lambda: None
    service.sync_rounds()
    assert 8 not in service.tracker.team_rounds and 8 in service.tracker.rounds
