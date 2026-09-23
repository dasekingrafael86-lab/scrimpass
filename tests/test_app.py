"""
Automatisierte Tests für die wichtigsten Backend-Flows. Ergänzt (ersetzt nicht)
die manuellen Live-Prüfungen im Browser für alles, was echte OAuth-Logins,
Stripe-Zahlungen oder ein echtes Windows/Fortnite braucht.

Ausführen:
    cd /Users/rafi/scrimpass
    python3 -m pytest tests/ -v
"""
import io
import re
import sqlite3
from datetime import datetime, timedelta, timezone

from conftest import login_as

FMT = "%Y-%m-%d %H:%M:%S"


def iso(offset: timedelta) -> str:
    return (datetime.now(timezone.utc) + offset).strftime(FMT)


def make_user(app_module, user_id, **fields):
    conn = sqlite3.connect(app_module.DB_PATH)
    if fields:
        cols = ", ".join(fields.keys())
        placeholders = ", ".join("?" for _ in fields)
        conn.execute(f"INSERT OR IGNORE INTO users (id, {cols}) VALUES (?, {placeholders})",
                     (user_id, *fields.values()))
    else:
        conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (user_id,))
    conn.commit()
    conn.close()


def make_round(app_module, **overrides):
    defaults = dict(
        mode="Solo Battle Royale", region="EU", starts_at=iso(timedelta(minutes=30)),
        max_players=100, entry_fee=2, status="open", team_size=1, min_players=1,
    )
    defaults.update(overrides)
    conn = sqlite3.connect(app_module.DB_PATH)
    cur = conn.execute(
        "INSERT INTO scrim_rounds (mode, region, starts_at, max_players, entry_fee, status, team_size, min_players) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (defaults["mode"], defaults["region"], defaults["starts_at"], defaults["max_players"],
         defaults["entry_fee"], defaults["status"], defaults["team_size"], defaults["min_players"]),
    )
    round_id = cur.lastrowid
    conn.commit()
    conn.close()
    return round_id


def db_one(app_module, query, *args):
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(query, args).fetchone()
    conn.close()
    return row


# ---------------------------------------------------------------------------
# Gast-Zugriff: Browsen ohne Login erlaubt, Aktionen verlangen Anmeldung.
# ---------------------------------------------------------------------------

def test_guest_can_browse_matches(app_module, client):
    make_round(app_module)
    res = client.get("/api/matches")
    assert res.status_code == 200
    assert res.get_json()["matches"][0]["joined"] is False


def test_guest_cannot_join_match(app_module, client):
    round_id = make_round(app_module)
    res = client.post(f"/api/matches/{round_id}/join")
    assert res.status_code == 401


def test_root_serves_without_login(client):
    # / darf niemanden mehr zu /login zwingen (per früherer Aufgabe in dieser Session).
    res = client.get("/")
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# Beitreten, Mindestteilnehmer, automatische Stornierung + Rückerstattung.
# ---------------------------------------------------------------------------

def test_join_match_deducts_credits(app_module, client):
    make_user(app_module, "u1", credits=10)
    round_id = make_round(app_module, entry_fee=3)
    login_as(client, "u1")
    res = client.post(f"/api/matches/{round_id}/join")
    assert res.status_code == 200
    assert db_one(app_module, "SELECT credits FROM users WHERE id='u1'")["credits"] == 7
    assert db_one(app_module, "SELECT status FROM scrim_participants WHERE round_id=? AND user_id='u1'", round_id)


def test_join_match_insufficient_credits_is_free_join(app_module, client):
    # Zu wenig Credits blockiert den Beitritt nicht — es wird ein "Free-Join"
    # ohne Teilnahmegebühr (entry_paid=0), die Credits bleiben unangetastet.
    make_user(app_module, "u1", credits=1)
    round_id = make_round(app_module, entry_fee=5)
    login_as(client, "u1")
    res = client.post(f"/api/matches/{round_id}/join")
    assert res.status_code == 200
    assert res.get_json()["entryPaid"] is False
    assert db_one(app_module, "SELECT credits FROM users WHERE id='u1'")["credits"] == 1
    row = db_one(app_module, "SELECT entry_paid FROM scrim_participants WHERE round_id=? AND user_id='u1'", round_id)
    assert row["entry_paid"] == 0


def test_underfilled_round_auto_cancels_and_refunds(app_module, client):
    make_user(app_module, "u1", credits=10)
    # Startzeit in der Vergangenheit + hoher min_players -> beim nächsten
    # authentifizierten Request greift settle_expired_rounds_if_needed.
    round_id = make_round(app_module, starts_at=iso(-timedelta(minutes=5)), min_players=65, status="open")
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'u1', 'accepted', 1)", (round_id,))
    conn.execute("UPDATE users SET credits = credits - 2 WHERE id='u1'")
    conn.execute("INSERT INTO credit_transactions (user_id, amount, reason, meta) VALUES ('u1', -2, 'match_entry', ?)", (str(round_id),))
    conn.commit()
    conn.close()

    login_as(client, "u1")
    res = client.get("/api/profile")  # jeder eingeloggte Request löst die Prüfung aus
    assert res.status_code == 200
    assert db_one(app_module, "SELECT status FROM scrim_rounds WHERE id=?", round_id)["status"] == "cancelled"
    assert db_one(app_module, "SELECT credits FROM users WHERE id='u1'")["credits"] == 10  # zurückerstattet


# ---------------------------------------------------------------------------
# Bann-Kaskade: Platzierungen rücken nach, Preisgeld wird neu verteilt.
# ---------------------------------------------------------------------------

def test_ban_cascades_prize_reshuffle(app_module, client):
    round_id = make_round(app_module, status="completed")
    conn = sqlite3.connect(app_module.DB_PATH)
    for i, uid in enumerate(["p1", "p2", "p3", "p4"], start=1):
        conn.execute("INSERT OR IGNORE INTO users (id, credits) VALUES (?, 0)", (uid,))
        credits = app_module.PRIZE_BREAKDOWN.get(i, 0)
        conn.execute(
            "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, credits_won) "
            "VALUES (?, ?, 'accepted', 1, ?, ?)",
            (round_id, uid, i, credits),
        )
        if credits:
            conn.execute("UPDATE users SET credits = credits + ? WHERE id=?", (credits, uid))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    res = client.post(f"/api/admin/users/p1/ban", json={"roundId": round_id, "reason": "Cheating"})
    assert res.status_code == 200

    assert db_one(app_module, "SELECT banned FROM users WHERE id='p1'")["banned"] == 1
    p1 = db_one(app_module, "SELECT placement, credits_won FROM scrim_participants WHERE round_id=? AND user_id='p1'", round_id)
    assert p1["placement"] is None
    for uid, expected_place in [("p2", 1), ("p3", 2), ("p4", 3)]:
        row = db_one(app_module, "SELECT placement, credits_won FROM scrim_participants WHERE round_id=? AND user_id=?", round_id, uid)
        assert row["placement"] == expected_place
        assert row["credits_won"] == app_module.PRIZE_BREAKDOWN.get(expected_place, 0)


# ---------------------------------------------------------------------------
# Teams: erstellen, einladen, annehmen, Mitglied entfernen.
# ---------------------------------------------------------------------------

def test_team_lifecycle(app_module, client):
    make_user(app_module, "owner1", username="OwnerOne")
    make_user(app_module, "member1", username="MemberOne")

    login_as(client, "owner1")
    res = client.post("/api/teams", json={"name": "Testteam", "icon": "🛡️", "size": 2})
    assert res.status_code == 200
    team_id = res.get_json()["team"]["id"]

    res = client.post(f"/api/teams/{team_id}/invite", json={"username": "MemberOne"})
    assert res.status_code == 200
    invite_id = db_one(app_module, "SELECT id FROM team_invites WHERE team_id=?", team_id)["id"]

    login_as(client, "member1")
    res = client.post(f"/api/invites/{invite_id}/accept")
    assert res.status_code == 200
    assert db_one(app_module, "SELECT 1 FROM team_members WHERE team_id=? AND user_id='member1'", team_id)

    # Nicht-Owner darf niemanden entfernen.
    res = client.delete(f"/api/teams/{team_id}/members/member1")
    assert res.status_code == 403

    login_as(client, "owner1")
    res = client.delete(f"/api/teams/{team_id}/members/owner1")  # sich selbst -> verboten
    assert res.status_code == 400
    res = client.delete(f"/api/teams/{team_id}/members/member1")
    assert res.status_code == 200
    assert not db_one(app_module, "SELECT 1 FROM team_members WHERE team_id=? AND user_id='member1'", team_id)


# ---------------------------------------------------------------------------
# SP-Client: Pairing, Aktivierungspflicht vor Rundenstart, Ergebnis-Meldung.
# ---------------------------------------------------------------------------

def test_client_pairing_and_report_flow(app_module, client):
    # /client/download verlangt eine (irgendeine) Datei an CLIENT_EXE_PATH — der
    # Inhalt ist für den Pairing-Code im Dateinamen irrelevant, nur die Existenz zählt.
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")

    make_user(app_module, "cu1", credits=0)
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=10)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'cu1', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "cu1")
    res = client.get("/client/download")
    assert res.status_code == 200
    disposition = res.headers["Content-Disposition"]
    match = re.search(r"_([A-HJ-NP-Z2-9]{16})_", disposition)
    assert match, disposition
    code = match.group(1)

    guest = app_module.app.test_client()  # der Client hat keine eigene Web-Session
    res = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test-PC"})
    assert res.status_code == 200
    token = res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Melden vor der Aktivierung ist nicht erlaubt.
    res = guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 3}, headers=headers)
    assert res.status_code == 400

    res = guest.post(f"/api/client/matches/{round_id}/activate", headers=headers)
    assert res.status_code == 200

    res = guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 3}, headers=headers)
    assert res.status_code == 200
    row = db_one(app_module, "SELECT placement, auto_reported, credits_won FROM scrim_participants WHERE round_id=? AND user_id='cu1'", round_id)
    assert row["placement"] == 3
    assert row["auto_reported"] == 1
    # Credits gibt's erst, wenn der Admin abschließt — nicht sofort bei der Meldung.
    assert row["credits_won"] in (None, 0)

    # Zweite Meldung für dieselbe Runde wird abgelehnt.
    res = guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 1}, headers=headers)
    assert res.status_code == 409

    # Getrenntes Konto: Token danach ungültig.
    login_as(client, "cu1")
    token_id = db_one(app_module, "SELECT id FROM client_tokens WHERE user_id='cu1'")["id"]
    res = client.delete(f"/api/client/tokens/{token_id}")
    assert res.status_code == 200
    res = guest.get("/api/client/matches", headers=headers)
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Match-Code (manuelle Beitrittsart) & Herleitung fehlender Platzierungen.
# ---------------------------------------------------------------------------

def test_match_code_only_visible_to_accepted_participants(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    make_user(app_module, "mc_joined")
    make_user(app_module, "mc_pending")
    make_user(app_module, "mc_outsider")
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'mc_joined', 'accepted', 1)", (round_id,))
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'mc_pending', 'pending', 0)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    res = client.post(f"/api/admin/matches/{round_id}/code", json={"code": "1234-5678-9876"})
    assert res.status_code == 200
    assert db_one(app_module, "SELECT match_code FROM scrim_rounds WHERE id=?", round_id)["match_code"] == "1234-5678-9876"

    login_as(client, "mc_joined")
    assert client.get(f"/api/matches/{round_id}").get_json()["match"]["matchCode"] == "1234-5678-9876"

    login_as(client, "mc_pending")
    assert client.get(f"/api/matches/{round_id}").get_json()["match"]["matchCode"] is None

    login_as(client, "mc_outsider")
    assert client.get(f"/api/matches/{round_id}").get_json()["match"]["matchCode"] is None

    guest = app_module.app.test_client()
    assert guest.get(f"/api/matches/{round_id}").get_json()["match"]["matchCode"] is None


def test_missing_placement_inferred_when_exactly_one_gap(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=4, min_players=1)
    for uid in ("ip1", "ip2", "ip3", "ip4"):
        make_user(app_module, uid)

    conn = sqlite3.connect(app_module.DB_PATH)
    for uid, placement in [("ip1", 1), ("ip2", 3), ("ip3", 4)]:
        conn.execute(
            "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, auto_reported) "
            "VALUES (?, ?, 'accepted', 1, ?, 1)",
            (round_id, uid, placement),
        )
    # ip4 hat den Client vergessen zu aktivieren -> keine Platzierung
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'ip4', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    res = client.get(f"/api/admin/matches/{round_id}")
    assert res.status_code == 200
    participants = {p["userId"]: p for p in res.get_json()["participants"]}
    assert participants["ip4"]["placement"] == 2  # einzige noch freie Zahl von 1..4
    assert participants["ip4"]["placementSource"] == "inferred"
    assert participants["ip1"]["placementSource"] == "client"


def test_no_inference_with_multiple_gaps(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=4, min_players=1)
    for uid in ("mg1", "mg2", "mg3"):
        make_user(app_module, uid)

    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, auto_reported) "
        "VALUES (?, 'mg1', 'accepted', 1, 1, 1)",
        (round_id,),
    )
    for uid in ("mg2", "mg3"):
        conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, ?, 'accepted', 1)", (round_id, uid))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_id}").get_json()["participants"]}
    # Zwei Personen fehlen noch -> nicht eindeutig, wer welche Platzierung hat.
    assert participants["mg2"]["placementSource"] is None
    assert participants["mg3"]["placementSource"] is None


# ---------------------------------------------------------------------------
# Replay-Auswertung: Platzierungen aus einer hochgeladenen .replay-Datei
# rekonstruieren, auch für Teilnehmer ohne eigenen Client-Report. Die
# eigentliche Node-Subprozess-Ausführung wird hier NICHT vorausgesetzt (nicht
# jede Testumgebung hat node installiert) -- getestet wird die
# Platzierungs-Logik in apply_replay_placements() direkt, mit einer
# ausgedachten, aber realistisch geformten Parser-Ausgabe.
# ---------------------------------------------------------------------------

def link_epic(app_module, user_id, epic_account_id):
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute(
        "INSERT INTO epic_connections (user_id, epic_account_id, display_name) VALUES (?, ?, ?)",
        (user_id, epic_account_id, user_id),
    )
    conn.commit()
    conn.close()


def test_apply_replay_placements_solo(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1)
    for uid in ("rp_winner", "rp_second", "rp_third"):
        make_user(app_module, uid)
    conn = sqlite3.connect(app_module.DB_PATH)
    for uid in ("rp_winner", "rp_second", "rp_third"):
        conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, ?, 'accepted', 1)", (round_id, uid))
    conn.commit()
    conn.close()

    epic_second = "a" * 32
    epic_third = "b" * 32
    link_epic(app_module, "rp_second", epic_second)
    link_epic(app_module, "rp_third", epic_third)
    # rp_winner lädt selbst hoch -> kennt die eigene Platzierung direkt (1),
    # taucht deshalb gar nicht in den Eliminierungen auf.
    parsed = {
        "ownPlacement": 1,
        "totalPlayers": 3,
        "eliminations": [
            {"eliminated": epic_third, "timeMs": 1000},  # zuerst raus -> Platz 3
            {"eliminated": epic_second, "timeMs": 5000},  # danach -> Platz 2
        ],
    }
    conn = app_module.get_db()
    app_module.apply_replay_placements(conn, round_id, "rp_winner", parsed)
    conn.close()

    login_as(client, "admin_test_user")
    participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_id}").get_json()["participants"]}
    assert participants["rp_second"]["placement"] == 2
    assert participants["rp_second"]["placementSource"] == "replay"
    assert participants["rp_third"]["placement"] == 3
    assert participants["rp_third"]["placementSource"] == "replay"
    # Der Uploader kennt seine eigene Platzierung direkt (ownPlacement) --
    # unabhängig davon, ob er selbst einen Epic-Account verknüpft hat.
    assert participants["rp_winner"]["placement"] == 1
    assert participants["rp_winner"]["placementSource"] == "replay"


def test_apply_replay_placements_team_mode_uses_latest_teammate(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1, team_size=2)
    for uid in ("rp_t1a", "rp_t1b", "rp_uploader"):
        make_user(app_module, uid)
    conn = sqlite3.connect(app_module.DB_PATH)
    team_id = conn.execute("INSERT INTO teams (name, owner_id, size) VALUES ('Team RP', 'rp_t1a', 2)").lastrowid
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id) VALUES (?, 'rp_t1a', 'accepted', 1, ?)",
        (round_id, team_id),
    )
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id) VALUES (?, 'rp_t1b', 'accepted', 1, ?)",
        (round_id, team_id),
    )
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'rp_uploader', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    epic_a = "1" * 32
    epic_b = "2" * 32
    link_epic(app_module, "rp_t1a", epic_a)
    link_epic(app_module, "rp_t1b", epic_b)

    parsed = {
        "ownPlacement": 1,
        "totalPlayers": 3,
        "eliminations": [
            {"eliminated": epic_a, "timeMs": 1000},  # zuerst raus
            {"eliminated": epic_b, "timeMs": 4000},  # Teamkollege überlebt länger
        ],
    }
    conn = app_module.get_db()
    app_module.apply_replay_placements(conn, round_id, "rp_uploader", parsed)
    conn.close()

    login_as(client, "admin_test_user")
    participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_id}").get_json()["participants"]}
    # Das Team wird erst eliminiert, wenn der LETZTE Teammember rausfliegt --
    # beide Mitglieder bekommen deshalb dieselbe (bessere) Platzierung 2.
    assert participants["rp_t1a"]["placement"] == 2
    assert participants["rp_t1b"]["placement"] == 2


def test_replay_upload_requires_active_participant(app_module, client):
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")
    make_user(app_module, "ru1", credits=0)
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=10)), entry_fee=0)

    login_as(client, "ru1")
    res = client.get("/client/download")
    code = re.search(r"_([A-HJ-NP-Z2-9]{16})_", res.headers["Content-Disposition"]).group(1)
    guest = app_module.app.test_client()
    token = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test"}).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Nicht für die Runde angemeldet -> 403, auch ohne echte Replay-Datei im Body.
    res = guest.post(f"/api/client/matches/{round_id}/replay", headers=headers, data={"replay": (io.BytesIO(b"x"), "test.replay")}, content_type="multipart/form-data")
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Mit Guthaben kaufen: einmalig, keine automatische Abbuchung.
# ---------------------------------------------------------------------------

def test_guthaben_buy_success(app_module, client):
    make_user(app_module, "gu1", credits=5, guthaben_cents=1000)
    login_as(client, "gu1")
    res = client.post("/api/guthaben/buy", json={"offer": "Kleines Angebot"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["credits"] == 6  # Free-Credits zurückgesetzt, dann frisch vergeben
    assert data["guthabenCents"] == 1000 - (649 - 50)

    # Mehrere spätere Requests dürfen NICHTS mehr automatisch abbuchen.
    before = data["guthabenCents"]
    for _ in range(3):
        client.get("/api/profile")
    assert db_one(app_module, "SELECT guthaben_cents FROM users WHERE id='gu1'")["guthaben_cents"] == before


def test_guthaben_buy_insufficient_funds(app_module, client):
    make_user(app_module, "gu2", credits=5, guthaben_cents=10)
    login_as(client, "gu2")
    res = client.post("/api/guthaben/buy", json={"offer": "Kleines Angebot"})
    assert res.status_code == 402
    assert "Nicht genug Guthaben" in res.get_json()["error"]
    assert db_one(app_module, "SELECT guthaben_cents, credits FROM users WHERE id='gu2'")["guthaben_cents"] == 10


def test_guthaben_buy_requires_login(client):
    res = client.post("/api/guthaben/buy", json={"offer": "Kleines Angebot"})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Cheat-Reports (mit Rate-Limit-Grenze eigens getestet, s. u.).
# ---------------------------------------------------------------------------

def test_cheat_report_create_and_admin_review(app_module, client):
    make_user(app_module, "reporter1")
    login_as(client, "reporter1")
    res = client.post("/api/reports", data={
        "reportedName": "VerdaechtigerSpieler",
        "description": "Aimbot im Endkreis gesehen.",
        "clipLink": "",
        "photos": (io.BytesIO(b"not a real image"), "beweis.png"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200

    login_as(client, "admin_test_user")
    res = client.get("/api/admin/reports")
    assert res.status_code == 200
    reports = res.get_json()["reports"]
    assert any(r["reportedName"] == "VerdaechtigerSpieler" for r in reports)


def test_avatar_selection_validates_id(app_module, client):
    make_user(app_module, "au1")
    login_as(client, "au1")
    assert client.post("/api/profile/avatar", json={"avatarId": "nicht-echt"}).status_code == 400
    assert client.post("/api/profile/avatar", json={"avatarId": "ninja"}).status_code == 200
    assert db_one(app_module, "SELECT avatar_id FROM users WHERE id='au1'")["avatar_id"] == "ninja"


# ---------------------------------------------------------------------------
# Auszahlungen (manuelle SEPA-Überweisung durch den Admin).
# ---------------------------------------------------------------------------

BANK_DETAILS = {
    "firstName": "Erika", "lastName": "Musterfrau", "addressLine1": "Musterstr. 1",
    "city": "Berlin", "postalCode": "10115", "country": "DE",
    "iban": "DE89370400440532013000", "bic": "COBADEFFXXX",
}


def test_payout_admin_flow(app_module, client):
    make_user(app_module, "po1", guthaben_cents=5000)
    login_as(client, "po1")
    assert client.post("/api/payout/bank-details", json=BANK_DETAILS).status_code == 200
    res = client.post("/api/payout/request", json={"amountCents": 2000})
    assert res.status_code == 200
    request_id = db_one(app_module, "SELECT id FROM payout_requests WHERE user_id='po1'")["id"]

    login_as(client, "admin_test_user")
    res = client.get("/api/admin/payout-requests")
    assert res.status_code == 200
    row = next(r for r in res.get_json()["requests"] if r["id"] == request_id)
    assert row["amountCents"] == 2000
    assert row["hasBankDetails"] is True
    assert row["status"] == "pending"

    # Vor "Genehmigt" darf nicht direkt auf "Ausgezahlt" gesprungen werden.
    res = client.post(f"/api/admin/payout-requests/{request_id}", json={"status": "paid"})
    assert res.status_code == 400

    res = client.get(f"/api/admin/payout-requests/{request_id}/bank-details")
    assert res.status_code == 200
    bd = res.get_json()["bankDetails"]
    assert bd["iban"] == BANK_DETAILS["iban"]
    assert bd["bic"] == BANK_DETAILS["bic"]
    assert db_one(
        app_module, "SELECT COUNT(*) AS c FROM payout_bank_detail_views WHERE payout_request_id=?", request_id
    )["c"] == 1

    assert client.post(f"/api/admin/payout-requests/{request_id}", json={"status": "approved"}).status_code == 200
    res = client.post(f"/api/admin/payout-requests/{request_id}", json={"status": "paid"})
    assert res.status_code == 200

    final = db_one(app_module, "SELECT status, paid_by, paid_at FROM payout_requests WHERE id=?", request_id)
    assert final["status"] == "paid"
    assert final["paid_by"] == "admin_test_user"
    assert final["paid_at"] is not None


def test_payout_reject_refunds_guthaben(app_module, client):
    make_user(app_module, "po2", guthaben_cents=3000)
    login_as(client, "po2")
    client.post("/api/payout/bank-details", json=BANK_DETAILS)
    client.post("/api/payout/request", json={"amountCents": 1500})
    request_id = db_one(app_module, "SELECT id FROM payout_requests WHERE user_id='po2'")["id"]
    assert db_one(app_module, "SELECT guthaben_cents FROM users WHERE id='po2'")["guthaben_cents"] == 1500

    login_as(client, "admin_test_user")
    res = client.post(f"/api/admin/payout-requests/{request_id}", json={"status": "rejected"})
    assert res.status_code == 200
    assert db_one(app_module, "SELECT guthaben_cents FROM users WHERE id='po2'")["guthaben_cents"] == 3000


# ---------------------------------------------------------------------------
# Rate-Limiting: eigener Test, aktiviert es bewusst (sonst global ausgeschaltet).
# ---------------------------------------------------------------------------

def test_rate_limit_blocks_after_threshold(app_module, client):
    app_module.app.config["RATELIMIT_ENABLED"] = True
    make_user(app_module, "rl1")
    login_as(client, "rl1")
    statuses = [client.post("/api/client/pair/exchange", json={"code": "XXXXXX"}).status_code for _ in range(12)]
    assert statuses[:10] == [400] * 10
    assert 429 in statuses[10:]
