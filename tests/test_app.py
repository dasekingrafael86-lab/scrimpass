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
    link_epic(app_module, "u1", "1" * 32)
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
    link_epic(app_module, "u1", "1" * 32)
    round_id = make_round(app_module, entry_fee=5)
    login_as(client, "u1")
    res = client.post(f"/api/matches/{round_id}/join")
    assert res.status_code == 200
    assert res.get_json()["entryPaid"] is False
    assert db_one(app_module, "SELECT credits FROM users WHERE id='u1'")["credits"] == 1


def test_join_match_requires_linked_epic_account(app_module, client):
    make_user(app_module, "u_noepic", credits=10)
    round_id = make_round(app_module, entry_fee=0)
    login_as(client, "u_noepic")
    res = client.post(f"/api/matches/{round_id}/join")
    assert res.status_code == 400
    data = res.get_json()
    assert "Epic" in data["error"]
    assert data["code"] == "epic_not_linked"
    assert not db_one(app_module, "SELECT 1 FROM scrim_participants WHERE round_id=? AND user_id='u_noepic'", round_id)


def test_join_match_free_join_ignores_free_credits_balance(app_module, client):
    """Gratis-Kredite zählen NICHT für die Teilnahmegebühr -- nur
    auszahlungsfähige "credits". Wer genug free_credits, aber nicht genug
    credits hat, bekommt trotzdem einen Free-Join."""
    make_user(app_module, "u_free", credits=0)
    link_epic(app_module, "u_free", "1" * 32)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("UPDATE users SET free_credits = 100 WHERE id='u_free'")
    conn.commit()
    conn.close()
    round_id = make_round(app_module, entry_fee=5)
    login_as(client, "u_free")
    res = client.post(f"/api/matches/{round_id}/join")
    assert res.status_code == 200
    data = res.get_json()
    assert data["entryPaid"] is False
    assert data["freeCredits"] == 100  # unangetastet
    row = db_one(app_module, "SELECT entry_paid FROM scrim_participants WHERE round_id=? AND user_id='u_free'", round_id)
    assert row["entry_paid"] == 0


# ---------------------------------------------------------------------------
# Zwei Kredit-Arten: auszahlungsfähige "credits" (bezahlte Teilnahme) vs.
# nicht auszahlungsfähige "free_credits" (Free-Join-Gewinne).
# ---------------------------------------------------------------------------

def test_paid_round_win_credits_go_to_paid_pool(app_module, client):
    make_user(app_module, "wp1", credits=10)
    round_id = make_round(app_module, entry_fee=0, min_players=1)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'wp1', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": [{"userId": "wp1", "placement": 1}]})
    assert res.status_code == 200

    row = db_one(app_module, "SELECT credits, free_credits FROM users WHERE id='wp1'")
    assert row["credits"] == 10 + app_module.PRIZE_BREAKDOWN[1]
    assert row["free_credits"] == 0


def test_free_join_round_win_credits_go_to_free_pool(app_module, client):
    make_user(app_module, "wf1", credits=0)
    round_id = make_round(app_module, entry_fee=0, min_players=1)
    conn = sqlite3.connect(app_module.DB_PATH)
    # entry_paid=0: dieser Teilnehmer ist per Free-Join dabei (z.B. weil er
    # zum Beitrittszeitpunkt nicht genug auszahlungsfähige Credits hatte).
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'wf1', 'accepted', 0)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": [{"userId": "wf1", "placement": 1}]})
    assert res.status_code == 200

    row = db_one(app_module, "SELECT credits, free_credits FROM users WHERE id='wf1'")
    assert row["credits"] == 0
    assert row["free_credits"] == app_module.PRIZE_BREAKDOWN[1]


def test_shop_redeem_spends_free_credits_before_paid_credits(app_module, client):
    make_user(app_module, "sr1", credits=10)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("UPDATE users SET free_credits = 3 WHERE id='sr1'")
    conn.commit()
    conn.close()

    login_as(client, "sr1")
    # "Snipe" kostet 5 Credits (siehe SHOP_ITEMS) -- 3 davon aus free_credits,
    # der Rest (2) aus den auszahlungsfähigen credits.
    res = client.post("/api/shop/redeem", json={"item": "Snipe"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["freeCredits"] == 0
    assert data["credits"] == 8  # 10 - 2
    assert data["snipes"] == 1


def test_shop_convert_no_longer_requires_active_plan(app_module, client):
    """Frühere Regel (nur mit aktivem Plan eintauschbar) ist entfallen --
    auszahlungsfähige Credits sind jetzt immer direkt eintauschbar."""
    make_user(app_module, "sc1", credits=10)
    login_as(client, "sc1")
    # Bewusst KEIN Plan für diesen Nutzer angelegt.
    res = client.post("/api/shop/convert", json={"amount": 5})
    assert res.status_code == 200
    data = res.get_json()
    assert data["credits"] == 5
    assert data["guthabenCents"] == 500


def test_shop_convert_ignores_free_credits(app_module, client):
    make_user(app_module, "sc2", credits=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("UPDATE users SET free_credits = 50 WHERE id='sc2'")
    conn.commit()
    conn.close()

    login_as(client, "sc2")
    res = client.post("/api/shop/convert", json={"amount": 5})
    assert res.status_code == 400
    assert "auszahlungsfähige" in res.get_json()["error"]
    assert db_one(app_module, "SELECT guthaben_cents FROM users WHERE id='sc2'")["guthaben_cents"] == 0


def test_plan_expiry_no_longer_auto_converts_credits(app_module, client):
    """settle_expired_plan_if_needed wurde entfernt -- ein abgelaufener Plan
    darf Credits nicht mehr automatisch in Guthaben umwandeln, das
    entscheidet jetzt allein die Kredit-Art."""
    make_user(app_module, "pe1", credits=20, guthaben_cents=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute(
        "INSERT INTO user_plans (user_id, plan_key, expires_at) VALUES ('pe1', 'Kleines Angebot', ?)",
        (iso(timedelta(minutes=-5)),),
    )
    conn.commit()
    conn.close()

    login_as(client, "pe1")
    client.get("/api/profile")  # jeder Request löste früher settle_expired_plan_if_needed aus
    row = db_one(app_module, "SELECT credits, guthaben_cents FROM users WHERE id='pe1'")
    assert row["credits"] == 20
    assert row["guthaben_cents"] == 0


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

def test_client_info_reports_latest_version(app_module, client):
    """Der laufende Client prüft darüber (ohne Auth, siehe api_client_info),
    ob er veraltet ist, und benachrichtigt sich sonst selbst über sein
    Tray-Icon -- kein Login nötig, muss also auch für Gäste funktionieren."""
    res = client.get("/api/client/info")
    assert res.status_code == 200
    assert res.get_json()["latestVersion"] == app_module.CLIENT_LATEST_VERSION


def test_client_pairing_and_report_flow(app_module, client):
    # /client/download verlangt eine (irgendeine) Datei an CLIENT_EXE_PATH — der
    # Inhalt ist für den Pairing-Code im Dateinamen irrelevant, nur die Existenz zählt.
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")

    make_user(app_module, "cu1", credits=0)
    # Knapp innerhalb von CLIENT_MATCH_EARLIEST (2 Min.), damit die sofort
    # folgende Meldung nicht am Zeitfenster-Check scheitert.
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0)
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


def test_client_report_propagates_placement_to_teammate(app_module, client):
    """Bei Duo/Trio wird ein Team immer gemeinsam eliminiert -- reicht also,
    wenn EIN Mitglied seinen Client aktiviert und meldet, gilt das
    automatisch fürs ganze Team, auch für einen Teamkollegen, der selbst nie
    aktiviert hat."""
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")
    make_user(app_module, "tm_reporter", credits=0)
    make_user(app_module, "tm_mate", credits=0)
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0, team_size=2)
    conn = sqlite3.connect(app_module.DB_PATH)
    team_id = conn.execute("INSERT INTO teams (name, owner_id, size) VALUES ('Team TM', 'tm_reporter', 2)").lastrowid
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id) VALUES (?, 'tm_reporter', 'accepted', 1, ?)",
        (round_id, team_id),
    )
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id) VALUES (?, 'tm_mate', 'accepted', 1, ?)",
        (round_id, team_id),
    )
    conn.commit()
    conn.close()

    login_as(client, "tm_reporter")
    res = client.get("/client/download")
    code = re.search(r"_([A-HJ-NP-Z2-9]{16})_", res.headers["Content-Disposition"]).group(1)
    guest = app_module.app.test_client()
    token = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test-PC"}).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    guest.post(f"/api/client/matches/{round_id}/activate", headers=headers)

    res = guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 7}, headers=headers)
    assert res.status_code == 200

    reporter = db_one(app_module, "SELECT placement, auto_reported FROM scrim_participants WHERE round_id=? AND user_id='tm_reporter'", round_id)
    assert reporter["placement"] == 7
    assert reporter["auto_reported"] == 1
    mate = db_one(app_module, "SELECT placement, auto_reported FROM scrim_participants WHERE round_id=? AND user_id='tm_mate'", round_id)
    assert mate["placement"] == 7
    assert mate["auto_reported"] == 1


def test_client_report_does_not_overwrite_teammates_existing_placement(app_module, client):
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")
    make_user(app_module, "tm2_reporter", credits=0)
    make_user(app_module, "tm2_mate", credits=0)
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0, team_size=2)
    conn = sqlite3.connect(app_module.DB_PATH)
    team_id = conn.execute("INSERT INTO teams (name, owner_id, size) VALUES ('Team TM2', 'tm2_reporter', 2)").lastrowid
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id) VALUES (?, 'tm2_reporter', 'accepted', 1, ?)",
        (round_id, team_id),
    )
    # Teamkollege hat schon eine (z.B. vom Admin von Hand eingetragene) Platzierung.
    conn.execute(
        "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id, placement) VALUES (?, 'tm2_mate', 'accepted', 1, ?, 3)",
        (round_id, team_id),
    )
    conn.commit()
    conn.close()

    login_as(client, "tm2_reporter")
    res = client.get("/client/download")
    code = re.search(r"_([A-HJ-NP-Z2-9]{16})_", res.headers["Content-Disposition"]).group(1)
    guest = app_module.app.test_client()
    token = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test-PC"}).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    guest.post(f"/api/client/matches/{round_id}/activate", headers=headers)
    guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 9}, headers=headers)

    # Teamkollegen-Platzierung bleibt unverändert bei 3.
    mate = db_one(app_module, "SELECT placement FROM scrim_participants WHERE round_id=? AND user_id='tm2_mate'", round_id)
    assert mate["placement"] == 3


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

    # Mehrere Spieler laden unabhängig voneinander ein Replay für dieselbe
    # Runde hoch (gewollt, erhöht die Zuverlässigkeit) -- aber eine bereits
    # gesetzte Platzierung darf dadurch NIE nachträglich überschrieben werden,
    # selbst wenn (z.B. durch ein später verarbeitetes falsches Replay) ein
    # abweichender Wert reinkäme. Simuliert hier mit stark abweichenden
    # Platzierungen aus einem zweiten Aufruf.
    parsed_second = {
        "ownPlacement": 1,
        "totalPlayers": 3,
        "eliminations": [
            {"eliminated": epic_second, "timeMs": 500},  # würde Platz 3 statt 2 ergeben
            {"eliminated": epic_third, "timeMs": 999},   # würde Platz 2 statt 3 ergeben
        ],
    }
    conn = app_module.get_db()
    app_module.apply_replay_placements(conn, round_id, "rp_third", parsed_second)
    conn.close()

    participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_id}").get_json()["participants"]}
    assert participants["rp_second"]["placement"] == 2  # unverändert
    assert participants["rp_third"]["placement"] == 3  # unverändert
    assert participants["rp_winner"]["placement"] == 1  # unverändert


def test_apply_replay_placements_team_mode_applies_own_team_only(app_module, client):
    """Bei Duo/Trio liefert eine einzelne Replay-Datei nur eine zuverlässige
    Platzierung: die des Uploader-Teams selbst (ownPlacement, direkt vom
    Spiel). Andere Teams lassen sich NICHT sicher zuordnen, weil totalPlayers
    einzelne Spieler zählt (nicht Teams) und playerElim-Events keine
    Team-Zugehörigkeit fremder Spieler enthalten -- ein "Rang unter allen
    Spielern"-Wert wäre keine echte Team-Platzierung. Getestet mit echten
    Zahlenverhältnissen aus einer echten Duo-Replay (100 Spieler, eigene
    Platzierung 21 von ~50 Teams)."""
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=100, min_players=1, team_size=2)
    for uid in ("rp_uploader", "rp_a2", "rp_b1", "rp_b2"):
        make_user(app_module, uid)
    conn = sqlite3.connect(app_module.DB_PATH)
    team_a = conn.execute("INSERT INTO teams (name, owner_id, size) VALUES ('Team A', 'rp_uploader', 2)").lastrowid
    team_b = conn.execute("INSERT INTO teams (name, owner_id, size) VALUES ('Team B', 'rp_b1', 2)").lastrowid
    for uid, team_id in (("rp_uploader", team_a), ("rp_a2", team_a), ("rp_b1", team_b), ("rp_b2", team_b)):
        conn.execute(
            "INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, team_id) VALUES (?, ?, 'accepted', 1, ?)",
            (round_id, uid, team_id),
        )
    conn.commit()
    conn.close()

    epic_b1 = "1" * 32
    epic_b2 = "2" * 32
    link_epic(app_module, "rp_b1", epic_b1)
    link_epic(app_module, "rp_b2", epic_b2)

    parsed = {
        "ownPlacement": 21,
        "totalPlayers": 100,
        "eliminations": [
            {"eliminated": epic_b1, "timeMs": 108407},
            {"eliminated": epic_b2, "timeMs": 497050},
        ],
    }
    conn = app_module.get_db()
    status, _detail = app_module.apply_replay_placements(conn, round_id, "rp_uploader", parsed)
    conn.close()

    assert status == "applied"
    login_as(client, "admin_test_user")
    participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_id}").get_json()["participants"]}
    # Uploader-Team: beide Mitglieder bekommen die echte ownPlacement (21),
    # selbst rp_a2, der/die selbst gar nicht im Replay auftaucht.
    assert participants["rp_uploader"]["placement"] == 21
    assert participants["rp_a2"]["placement"] == 21
    # Team B taucht zwar im Replay auf, bekommt aber bewusst KEINE
    # Platzierung -- die wäre ohne Team-Zuordnung fremder Spieler nicht
    # zuverlässig herleitbar.
    assert participants["rp_b1"]["placementSource"] is None
    assert participants["rp_b2"]["placementSource"] is None


def test_apply_replay_placements_rejects_unrelated_match(app_module, client):
    """Der Client erkennt eine Runde nur über das Zeitfenster, nicht über die
    tatsächliche Lobby -- wer statt der echten Custom-Lobby ein beliebiges
    anderes Match hochlädt, darf sich damit KEINE Platzierung erschleichen
    können, auch nicht die eigene. Erkennungsmerkmal: keiner der anderen
    (per Epic verknüpften) Rundenteilnehmer taucht in der Replay auf."""
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1)
    for uid in ("cheater", "real_other_player"):
        make_user(app_module, uid)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'cheater', 'accepted', 1)", (round_id,))
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'real_other_player', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    # real_other_player ist per Epic verknüpft, taucht in der (gefälschten)
    # Replay aber nirgends auf -- starkes Indiz, dass es nicht die richtige
    # Lobby war.
    link_epic(app_module, "real_other_player", "9" * 32)

    parsed = {
        "ownPlacement": 1,  # "cheater" behauptet, ein fremdes Match gewonnen zu haben
        "totalPlayers": 20,
        "eliminations": [
            {"eliminated": "a" * 32, "timeMs": 1000},
            {"eliminated": "b" * 32, "timeMs": 2000},
        ],
    }
    conn = app_module.get_db()
    app_module.apply_replay_placements(conn, round_id, "cheater", parsed)
    conn.close()

    login_as(client, "admin_test_user")
    participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_id}").get_json()["participants"]}
    # Keine Platzierung wird übernommen -- auch nicht die des Uploaders selbst.
    assert participants["cheater"]["placementSource"] is None
    assert participants["real_other_player"]["placementSource"] is None


def test_apply_replay_placements_rejects_collusion_with_better_matching_round(app_module, client):
    """Zwei Komplizen sind fuer die 'echte' Runde A angemeldet (zusammen mit
    echten Mitspielern), spielen aber stattdessen mit einem dritten Freund
    eine kleinere Nebenrunde B, fuer die sie ebenfalls angemeldet sind, und
    versuchen, das Replay davon fuer Runde A einzureichen. Ein einfacher
    "kommt mind. einer vor"-Check wuerde das faelschlich durchlassen (ihr
    Komplize aus Runde A taucht ja auch in Runde B auf) -- die
    Bestueberstimmungs-Pruefung gegen Runde B muss das trotzdem verhindern,
    weil Runde B klar besser passt (mehr bekannte Teilnehmer treffen zu)."""
    round_a = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1)
    round_b = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1)
    for uid in ("colluder1", "colluder2", "colluder3", "real_a_player"):
        make_user(app_module, uid)

    conn = sqlite3.connect(app_module.DB_PATH)
    # Runde A ("echt"): beide Komplizen sind dort ganz normal mit angemeldet,
    # zusammen mit einem echten anderen Spieler.
    for uid in ("colluder1", "colluder2", "real_a_player"):
        conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, ?, 'accepted', 1)", (round_a, uid))
    # Runde B (Nebenrunde): dieselben zwei Komplizen plus ein dritter Freund.
    for uid in ("colluder1", "colluder2", "colluder3"):
        conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, ?, 'accepted', 1)", (round_b, uid))
    conn.commit()
    conn.close()

    epic_colluder2 = "7" * 32
    epic_colluder3 = "6" * 32
    epic_real_a = "8" * 32
    link_epic(app_module, "colluder2", epic_colluder2)
    link_epic(app_module, "colluder3", epic_colluder3)
    link_epic(app_module, "real_a_player", epic_real_a)

    # Tatsaechlich gespieltes Match (Runde B): colluder2 UND colluder3
    # tauchen auf, real_a_player (nur in Runde A) fehlt komplett.
    parsed = {
        "ownPlacement": 1,
        "totalPlayers": 3,
        "eliminations": [
            {"eliminated": epic_colluder2, "timeMs": 1000},
            {"eliminated": epic_colluder3, "timeMs": 2000},
        ],
    }

    # Versuch, das als Ergebnis fuer Runde A einzureichen: Ueberschneidung
    # mit Runde A ist 1 (colluder2), mit Runde B aber 2 (colluder2 +
    # colluder3) -- Runde B passt besser, Runde A darf NICHTS uebernehmen.
    conn = app_module.get_db()
    app_module.apply_replay_placements(conn, round_a, "colluder1", parsed)
    conn.close()

    login_as(client, "admin_test_user")
    a_participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_a}").get_json()["participants"]}
    assert a_participants["colluder1"]["placementSource"] is None
    assert a_participants["colluder2"]["placementSource"] is None
    assert a_participants["real_a_player"]["placementSource"] is None

    # Zur Kontrolle: für die tatsächlich gespielte Runde B klappt es normal.
    conn = app_module.get_db()
    app_module.apply_replay_placements(conn, round_b, "colluder1", parsed)
    conn.close()
    b_participants = {p["userId"]: p for p in client.get(f"/api/admin/matches/{round_b}").get_json()["participants"]}
    assert b_participants["colluder1"]["placement"] == 1  # Uploader, nie eliminiert -> Gewinner
    assert b_participants["colluder3"]["placement"] == 2  # später eliminiert
    assert b_participants["colluder2"]["placement"] == 3  # zuerst eliminiert


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
# Kulanzfenster für späte Aktivierung (CLIENT_LATE_ACTIVATION_GRACE): wer den
# Client noch bis zu 5 Minuten nach dem offiziellen Rundenstart aktiviert,
# zählt trotzdem noch als rechtzeitig (Ladebildschirm-/Bus-Verzögerung).
# ---------------------------------------------------------------------------

def test_late_activation_within_grace_period_succeeds(app_module, client):
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")
    make_user(app_module, "la1", credits=0)
    # Runde hat vor 2 Minuten begonnen -- innerhalb der 5-Minuten-Kulanz.
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=-2)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'la1', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "la1")
    res = client.get("/client/download")
    code = re.search(r"_([A-HJ-NP-Z2-9]{16})_", res.headers["Content-Disposition"]).group(1)
    guest = app_module.app.test_client()
    token = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test"}).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = guest.post(f"/api/client/matches/{round_id}/activate", headers=headers)
    assert res.status_code == 200
    assert db_one(app_module, "SELECT checked_in_at FROM scrim_participants WHERE round_id=? AND user_id='la1'", round_id)["checked_in_at"] is not None

    # Melden funktioniert danach ganz normal (checked_in_at liegt innerhalb der Kulanz).
    res = guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 5}, headers=headers)
    assert res.status_code == 200


def test_late_activation_beyond_grace_period_rejected(app_module, client):
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")
    make_user(app_module, "la2", credits=0)
    # Runde hat vor 10 Minuten begonnen -- außerhalb der 5-Minuten-Kulanz.
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=-10)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'la2', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "la2")
    res = client.get("/client/download")
    code = re.search(r"_([A-HJ-NP-Z2-9]{16})_", res.headers["Content-Disposition"]).group(1)
    guest = app_module.app.test_client()
    token = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test"}).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = guest.post(f"/api/client/matches/{round_id}/activate", headers=headers)
    assert res.status_code == 400


def test_apply_replay_placements_return_value_contract(app_module, client):
    """apply_replay_placements liefert seit dieser Session (status, detail)
    zurück, statt implizit None -- u.a. damit der Admin-Bereich bei einem
    manuellen Web-Upload sehen kann, WARUM eine Replay nicht übernommen
    wurde. Deckt die wichtigsten Statuswerte ab."""
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1)
    for uid in ("rv_winner", "rv_second"):
        make_user(app_module, uid)
    conn = sqlite3.connect(app_module.DB_PATH)
    for uid in ("rv_winner", "rv_second"):
        conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, ?, 'accepted', 1)", (round_id, uid))
    conn.commit()
    conn.close()

    epic_second = "3" * 32
    link_epic(app_module, "rv_second", epic_second)
    parsed = {
        "ownPlacement": 1,
        "totalPlayers": 2,
        "eliminations": [{"eliminated": epic_second, "timeMs": 1000}],
    }

    conn = app_module.get_db()
    status, detail = app_module.apply_replay_placements(conn, round_id, "rv_winner", parsed)
    conn.close()
    assert status == "applied"
    assert "2" in detail  # 2 Teilnehmer bekamen eine Platzierung

    # Erneuter Aufruf mit denselben Daten: Platzierungen sind schon gesetzt
    # (Idempotenz-Schutz), es wird also nichts Neues übernommen.
    conn = app_module.get_db()
    status, detail = app_module.apply_replay_placements(conn, round_id, "rv_winner", parsed)
    conn.close()
    assert status == "nothing_written"

    # Runde nicht (mehr) offen.
    closed_round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, status="completed")
    conn = app_module.get_db()
    status, detail = app_module.apply_replay_placements(conn, closed_round_id, "rv_winner", parsed)
    conn.close()
    assert status == "round_not_open"

    # Unbrauchbare Parser-Ausgabe.
    other_round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    conn = app_module.get_db()
    status, detail = app_module.apply_replay_placements(conn, other_round_id, "rv_winner", {"totalPlayers": None})
    conn.close()
    assert status == "invalid_data"


# ---------------------------------------------------------------------------
# Manueller Web-Upload (Fallback, falls der SP-Client mal nicht funktioniert):
# Spieler laden die .replay-Datei direkt über die Website hoch, Auswertung
# läuft über denselben process_replay_async-Pfad wie beim Client-Upload.
# ---------------------------------------------------------------------------

def test_manual_replay_upload_requires_active_participant(app_module, client):
    make_user(app_module, "mru1", credits=0)
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0)
    login_as(client, "mru1")
    # Nicht für die Runde angemeldet -> 403, bevor überhaupt eine Datei geprüft wird.
    res = client.post(f"/api/matches/{round_id}/replay", data={"replay": (io.BytesIO(b"x"), "test.replay")}, content_type="multipart/form-data")
    assert res.status_code == 403


def test_manual_replay_upload_outside_window_rejected(app_module, client):
    make_user(app_module, "mru2", credits=0)
    # Weit außerhalb von CLIENT_MATCH_EARLIEST -- Startzeit liegt noch in weiter Ferne.
    round_id = make_round(app_module, starts_at=iso(timedelta(hours=5)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'mru2', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "mru2")
    res = client.post(f"/api/matches/{round_id}/replay", data={"replay": (io.BytesIO(b"x"), "test.replay")}, content_type="multipart/form-data")
    assert res.status_code == 400


def test_manual_replay_upload_requires_login(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0)
    res = client.post(f"/api/matches/{round_id}/replay", data={"replay": (io.BytesIO(b"x"), "test.replay")}, content_type="multipart/form-data")
    assert res.status_code == 401


def test_manual_replay_upload_creates_pending_record(app_module, client):
    """Ein akzeptierter Teilnehmer innerhalb des Zeitfensters darf hochladen:
    die Datei landet dauerhaft (nicht im temporären Ordner) und es entsteht
    ein manual_replay_uploads-Eintrag, den der Admin-Bereich auflisten kann."""
    make_user(app_module, "mru3", credits=0, username="mru3")
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'mru3', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "mru3")
    res = client.post(
        f"/api/matches/{round_id}/replay",
        data={"replay": (io.BytesIO(b"not a real replay"), "mymatch.replay")},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200

    row = db_one(
        app_module,
        "SELECT round_id, user_id, original_filename, status, stored_path FROM manual_replay_uploads WHERE round_id = ? AND user_id = 'mru3'",
        round_id,
    )
    assert row is not None
    assert row["original_filename"] == "mymatch.replay"
    assert (app_module.MANUAL_REPLAYS_DIR / row["stored_path"]).exists()

    login_as(client, "admin_test_user")
    uploads = client.get("/api/admin/replay-uploads").get_json()["uploads"]
    assert any(u["roundId"] == round_id and u["username"] == "mru3" for u in uploads)

    upload_id = next(u["id"] for u in uploads if u["roundId"] == round_id)
    detail = client.get(f"/api/admin/replay-uploads/{upload_id}").get_json()
    assert detail["originalFilename"] == "mymatch.replay"
    assert detail["downloadUrl"] == f"/api/admin/replay-uploads/{upload_id}/download"

    dl = client.get(f"/api/admin/replay-uploads/{upload_id}/download")
    assert dl.status_code == 200
    assert dl.data == b"not a real replay"


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


def test_second_plan_purchase_while_active_stacks_credits(app_module, client):
    """Kauft man einen zweiten Plan, während der erste noch läuft, sollen
    Credits (wie Laufzeit und Snipes) oben draufaddiert werden -- nicht auf
    0 zurückgesetzt und dann neu vergeben (das hätte den zweiten Kauf-Bonus
    effektiv verschluckt)."""
    make_user(app_module, "gu3", credits=0, guthaben_cents=10000)
    login_as(client, "gu3")

    res = client.post("/api/guthaben/buy", json={"offer": "Kleines Angebot"})
    assert res.status_code == 200
    assert res.get_json()["credits"] == 6  # frischer Umstieg vom Free-Tier: 0 + 6 Bonus

    # Noch während der Plan läuft: zweiter Kauf.
    res = client.post("/api/guthaben/buy", json={"offer": "Kleines Angebot"})
    assert res.status_code == 200
    assert res.get_json()["credits"] == 12  # 6 (vorhanden) + 6 (neuer Bonus), nicht zurückgesetzt

    snipes = db_one(app_module, "SELECT snipes FROM users WHERE id='gu3'")["snipes"]
    assert snipes == 4  # 2 + 2 Snipes, addiert (war schon vorher korrekt)


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
# Automatischer Rundenabschluss: keine Admin-Bestätigung mehr nötig. Sobald
# jemand nachweislich Platz 1 erreicht (Client oder Replay), startet ein
# 15-Minuten-Countdown (ROUND_AUTO_COMPLETE_DELAY), danach werden Ergebnisse
# + Credits automatisch vergeben. Der Admin kann Platzierungen jederzeit --
# auch nach dem automatischen Abschluss -- noch von Hand korrigieren.
# ---------------------------------------------------------------------------

def test_client_report_of_first_place_marks_round_finished(app_module, client):
    app_module.CLIENT_EXE_PATH.parent.mkdir(parents=True, exist_ok=True)
    app_module.CLIENT_EXE_PATH.write_bytes(b"dummy")
    make_user(app_module, "af1", credits=0)
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=1)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, checked_in_at) VALUES (?, 'af1', 'accepted', 1, ?)", (round_id, iso(timedelta(minutes=-5))))
    conn.commit()
    conn.close()

    login_as(client, "af1")
    res = client.get("/client/download")
    code = re.search(r"_([A-HJ-NP-Z2-9]{16})_", res.headers["Content-Disposition"]).group(1)
    guest = app_module.app.test_client()
    token = guest.post("/api/client/pair/exchange", json={"code": code, "label": "Test"}).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    guest.post(f"/api/client/matches/{round_id}/activate", headers=headers)

    assert db_one(app_module, "SELECT finished_at FROM scrim_rounds WHERE id=?", round_id)["finished_at"] is None

    res = guest.post(f"/api/client/matches/{round_id}/report", json={"placement": 1}, headers=headers)
    assert res.status_code == 200
    assert db_one(app_module, "SELECT finished_at FROM scrim_rounds WHERE id=?", round_id)["finished_at"] is not None


def test_client_report_of_non_winning_placement_does_not_mark_finished(app_module, client):
    """Ein Match ist per Definition erst vorbei, wenn jemand gewinnt -- eine
    gemeldete Platzierung 3 allein darf den Auto-Abschluss-Countdown noch
    nicht auslösen."""
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    make_user(app_module, "af2")
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, auto_reported) VALUES (?, 'af2', 'accepted', 1, 3, 1)", (round_id,))
    conn.commit()
    conn.close()

    conn = app_module.get_db()
    app_module._mark_round_finished_if_winner_known(conn, round_id)
    conn.commit()
    conn.close()
    assert db_one(app_module, "SELECT finished_at FROM scrim_rounds WHERE id=?", round_id)["finished_at"] is None


def test_settle_finished_rounds_auto_completes_after_delay(app_module, client):
    """Simuliert den Ablauf der 15 Minuten, indem finished_at direkt in die
    Vergangenheit gesetzt wird (kein echtes Warten im Test nötig) -- prüft,
    dass ein einfacher authentifizierter Request (der die lazy-Prüfung
    auslöst) die Runde automatisch abschließt und Credits vergibt."""
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0, max_players=10, min_players=1)
    for uid in ("sf_winner", "sf_second"):
        make_user(app_module, uid, credits=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, auto_reported) VALUES (?, 'sf_winner', 'accepted', 1, 1, 1)", (round_id,))
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, auto_reported) VALUES (?, 'sf_second', 'accepted', 1, 2, 1)", (round_id,))
    # finished_at liegt schon lange genug in der Vergangenheit.
    long_ago = (datetime.now(timezone.utc) - app_module.ROUND_AUTO_COMPLETE_DELAY - timedelta(minutes=1)).strftime(FMT)
    conn.execute("UPDATE scrim_rounds SET finished_at = ? WHERE id = ?", (long_ago, round_id))
    conn.commit()
    conn.close()

    # Noch nicht abgeschlossen, bevor irgendein Request die lazy-Prüfung anstößt.
    assert db_one(app_module, "SELECT status FROM scrim_rounds WHERE id=?", round_id)["status"] == "open"

    login_as(client, "sf_winner")
    client.get("/api/matches")  # beliebiger @optional_login/@login_required-Request reicht

    row = db_one(app_module, "SELECT status FROM scrim_rounds WHERE id=?", round_id)
    assert row["status"] == "completed"
    winner = db_one(app_module, "SELECT placement, credits_won FROM scrim_participants WHERE round_id=? AND user_id='sf_winner'", round_id)
    assert winner["placement"] == 1
    assert winner["credits_won"] == app_module.PRIZE_BREAKDOWN[1]
    assert db_one(app_module, "SELECT credits FROM users WHERE id='sf_winner'")["credits"] == app_module.PRIZE_BREAKDOWN[1]


def test_settle_finished_rounds_waits_out_the_delay(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    make_user(app_module, "sf3", credits=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid, placement, auto_reported) VALUES (?, 'sf3', 'accepted', 1, 1, 1)", (round_id,))
    # finished_at ist gerade erst gesetzt worden -- die 15 Minuten sind noch nicht um.
    conn.execute("UPDATE scrim_rounds SET finished_at = ? WHERE id = ?", (app_module.now_iso(), round_id))
    conn.commit()
    conn.close()

    login_as(client, "sf3")
    client.get("/api/matches")
    assert db_one(app_module, "SELECT status FROM scrim_rounds WHERE id=?", round_id)["status"] == "open"


def test_admin_can_edit_placements_after_auto_completion_without_double_crediting(app_module, client):
    """Der Admin darf eine bereits (automatisch) abgeschlossene Runde weiter
    bearbeiten. Zweimal dieselbe Platzierung speichern darf NICHT doppelt
    Credits auszahlen (Differenz-Buchung), und eine korrigierte Platzierung
    muss die Credits-Differenz korrekt verbuchen."""
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    make_user(app_module, "ed1", credits=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'ed1', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "admin_test_user")
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": [{"userId": "ed1", "placement": 2}]})
    assert res.status_code == 200
    assert db_one(app_module, "SELECT status FROM scrim_rounds WHERE id=?", round_id)["status"] == "completed"
    credits_after_first = db_one(app_module, "SELECT credits FROM users WHERE id='ed1'")["credits"]
    assert credits_after_first == app_module.PRIZE_BREAKDOWN[2]

    # Erneutes Speichern mit UNVERÄNDERTER Platzierung darf nichts doppelt auszahlen.
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": [{"userId": "ed1", "placement": 2}]})
    assert res.status_code == 200
    assert db_one(app_module, "SELECT credits FROM users WHERE id='ed1'")["credits"] == credits_after_first

    # Korrektur auf Platz 1: nur die Differenz wird gutgeschrieben.
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": [{"userId": "ed1", "placement": 1}]})
    assert res.status_code == 200
    assert db_one(app_module, "SELECT credits FROM users WHERE id='ed1'")["credits"] == app_module.PRIZE_BREAKDOWN[1]

    # Platzierung löschen (leeres Feld): Preisgeld wird vollständig zurückgebucht.
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": [{"userId": "ed1", "placement": None}]})
    assert res.status_code == 200
    assert db_one(app_module, "SELECT credits FROM users WHERE id='ed1'")["credits"] == 0
    assert db_one(app_module, "SELECT placement FROM scrim_participants WHERE round_id=? AND user_id='ed1'", round_id)["placement"] is None


def test_admin_cannot_edit_results_of_cancelled_round(app_module, client):
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=-1)), entry_fee=0, min_players=100)
    login_as(client, "admin_test_user")
    # Kein Teilnehmer, Startzeit vorbei -> beim nächsten Request automatisch storniert.
    client.get("/api/admin/matches")
    assert db_one(app_module, "SELECT status FROM scrim_rounds WHERE id=?", round_id)["status"] == "cancelled"
    res = client.post(f"/api/admin/matches/{round_id}/results", json={"placements": []})
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# Problem melden: kleine Zusatzoption neben dem manuellen Replay-Upload,
# unabhängig von einem Datei-Upload.
# ---------------------------------------------------------------------------

def test_problem_report_requires_active_participant(app_module, client):
    make_user(app_module, "pr1")
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    login_as(client, "pr1")
    res = client.post(f"/api/matches/{round_id}/problem-report", json={"description": "Platzierung wirkt falsch"})
    assert res.status_code == 403


def test_problem_report_requires_description(app_module, client):
    make_user(app_module, "pr2")
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'pr2', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()
    login_as(client, "pr2")
    res = client.post(f"/api/matches/{round_id}/problem-report", json={"description": "  "})
    assert res.status_code == 400


def test_problem_report_full_flow(app_module, client):
    make_user(app_module, "pr3", username="pr3")
    round_id = make_round(app_module, starts_at=iso(timedelta(minutes=30)), entry_fee=0)
    conn = sqlite3.connect(app_module.DB_PATH)
    conn.execute("INSERT INTO scrim_participants (round_id, user_id, status, entry_paid) VALUES (?, 'pr3', 'accepted', 1)", (round_id,))
    conn.commit()
    conn.close()

    login_as(client, "pr3")
    res = client.post(f"/api/matches/{round_id}/problem-report", json={"description": "Meine Platzierung fehlt komplett."})
    assert res.status_code == 200

    login_as(client, "admin_test_user")
    reports = client.get("/api/admin/problem-reports").get_json()["reports"]
    assert len(reports) == 1
    assert reports[0]["roundId"] == round_id
    assert reports[0]["username"] == "pr3"
    assert reports[0]["status"] == "open"

    res = client.post(f"/api/admin/problem-reports/{reports[0]['id']}", json={"status": "resolved"})
    assert res.status_code == 200
    reports = client.get("/api/admin/problem-reports").get_json()["reports"]
    assert reports[0]["status"] == "resolved"


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
