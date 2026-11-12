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
