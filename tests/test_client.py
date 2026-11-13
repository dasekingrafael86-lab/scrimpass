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

    def upload_replay(self, round_id, path):
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
