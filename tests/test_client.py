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

    def upload_replay(self, round_id, path, started_at=None, epic_hint=None):
        self.started = started_at
        self.epic_hint = epic_hint
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
