import os
import re
import secrets
import sqlite3
import urllib.parse
from datetime import timedelta
from functools import wraps
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory, session

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "scrimpass.db"
STATIC_DIR = BASE_DIR / "static"

DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET", "")
DISCORD_REDIRECT_URI = os.environ.get(
    "DISCORD_REDIRECT_URI", "http://localhost:8000/auth/discord/callback"
)

EPIC_CLIENT_ID = os.environ.get("EPIC_CLIENT_ID", "")
EPIC_CLIENT_SECRET = os.environ.get("EPIC_CLIENT_SECRET", "")
EPIC_REDIRECT_URI = os.environ.get(
    "EPIC_REDIRECT_URI", "http://localhost:8000/auth/epic/callback"
)
EPIC_DEPLOYMENT_ID = os.environ.get("EPIC_DEPLOYMENT_ID", "")

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.permanent_session_lifetime = timedelta(days=30)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    try:
        conn.execute("ALTER TABLE users ADD COLUMN username TEXT")
    except sqlite3.OperationalError:
        pass
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT '🛡️',
            size INTEGER NOT NULL,
            owner_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS team_members (
            team_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(team_id, user_id),
            FOREIGN KEY(team_id) REFERENCES teams(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS team_invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL,
            invited_user_id TEXT NOT NULL,
            invited_by TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(team_id) REFERENCES teams(id),
            FOREIGN KEY(invited_user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS discord_connections (
            user_id TEXT PRIMARY KEY,
            discord_id TEXT NOT NULL,
            username TEXT NOT NULL,
            avatar TEXT,
            connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS epic_connections (
            user_id TEXT PRIMARY KEY,
            epic_account_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.commit()
    conn.close()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Nicht angemeldet."}), 401
        return view(*args, **kwargs)
    return wrapped


USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")


def generate_username(conn):
    for _ in range(50):
        candidate = f"Spieler{secrets.randbelow(9000) + 1000}"
        existing = conn.execute(
            "SELECT 1 FROM users WHERE username = ?", (candidate,)
        ).fetchone()
        if not existing:
            return candidate
    return f"Spieler{secrets.token_hex(4)}"


def get_or_create_username(conn, user_id):
    row = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    if row and row["username"]:
        return row["username"]
    username = generate_username(conn)
    conn.execute("UPDATE users SET username = ? WHERE id = ?", (username, user_id))
    conn.commit()
    return username


def serialize_team(conn, team_row, current_user_id):
    members = conn.execute(
        """
        SELECT users.id AS id, users.username AS username, team_members.joined_at AS joined_at
        FROM team_members
        JOIN users ON users.id = team_members.user_id
        WHERE team_members.team_id = ?
        ORDER BY team_members.joined_at ASC
        """,
        (team_row["id"],),
    ).fetchall()
    return {
        "id": team_row["id"],
        "name": team_row["name"],
        "icon": team_row["icon"],
        "size": team_row["size"],
        "ownerId": team_row["owner_id"],
        "isOwner": team_row["owner_id"] == current_user_id,
        "members": [{"id": m["id"], "username": m["username"]} for m in members],
    }


def format_discord_username(discord_user):
    username = discord_user.get("username", "unbekannt")
    discriminator = discord_user.get("discriminator")
    if discriminator and discriminator != "0":
        return f"{username}#{discriminator}"
    return username


@app.route("/")
def index():
    if not session.get("user_id"):
        return redirect("/login")
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/login")
def login_page():
    if session.get("user_id"):
        return redirect("/")
    return send_from_directory(STATIC_DIR, "login.html")


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/auth/discord/login")
def discord_login():
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        return (
            "Discord-App ist noch nicht konfiguriert. Trage DISCORD_CLIENT_ID und "
            "DISCORD_CLIENT_SECRET in der .env-Datei ein (siehe README.md).",
            500,
        )
    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state
    params = {
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify",
        "state": state,
    }
    return redirect(f"https://discord.com/oauth2/authorize?{urllib.parse.urlencode(params)}")


@app.route("/auth/discord/callback")
def discord_callback():
    if request.args.get("error"):
        return redirect("/login?error=discord")

    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state or state != session.get("oauth_state"):
        return redirect("/login?error=discord")
    session.pop("oauth_state", None)

    token_res = requests.post(
        "https://discord.com/api/oauth2/token",
        data={
            "client_id": DISCORD_CLIENT_ID,
            "client_secret": DISCORD_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": DISCORD_REDIRECT_URI,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    if token_res.status_code != 200:
        return redirect("/login?error=discord")
    access_token = token_res.json().get("access_token")

    user_res = requests.get(
        "https://discord.com/api/users/@me",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if user_res.status_code != 200:
        return redirect("/login?error=discord")
    discord_user = user_res.json()
    discord_id = discord_user["id"]

    # Discord ist die Anmeldemethode: users.id == discord_id.
    conn = get_db()
    conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (discord_id,))
    conn.execute(
        """
        INSERT INTO discord_connections (user_id, discord_id, username, avatar)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            discord_id = excluded.discord_id,
            username = excluded.username,
            avatar = excluded.avatar,
            connected_at = CURRENT_TIMESTAMP
        """,
        (
            discord_id,
            discord_id,
            format_discord_username(discord_user),
            discord_user.get("avatar"),
        ),
    )
    conn.commit()
    conn.close()

    session.permanent = True
    session["user_id"] = discord_id
    return redirect("/?login=success")


@app.route("/auth/epic/login")
def epic_login():
    if not session.get("user_id"):
        return redirect("/login")
    if not EPIC_CLIENT_ID or not EPIC_CLIENT_SECRET:
        return (
            "Epic-Games-App ist noch nicht konfiguriert. Trage EPIC_CLIENT_ID und "
            "EPIC_CLIENT_SECRET in der .env-Datei ein (siehe README.md).",
            500,
        )
    state = secrets.token_urlsafe(24)
    session["epic_oauth_state"] = state
    params = {
        "client_id": EPIC_CLIENT_ID,
        "redirect_uri": EPIC_REDIRECT_URI,
        "response_type": "code",
        "scope": "basic_profile",
        "state": state,
    }
    return redirect(f"https://www.epicgames.com/id/authorize?{urllib.parse.urlencode(params)}")


@app.route("/auth/epic/callback")
def epic_callback():
    user_id = session.get("user_id")
    if not user_id:
        return redirect("/login")

    if request.args.get("error"):
        return redirect("/?epic=error")

    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state or state != session.get("epic_oauth_state"):
        return redirect("/?epic=error")
    session.pop("epic_oauth_state", None)

    token_data = {
        "grant_type": "authorization_code",
        "code": code,
    }
    if EPIC_DEPLOYMENT_ID:
        token_data["deployment_id"] = EPIC_DEPLOYMENT_ID

    token_res = requests.post(
        "https://api.epicgames.dev/epic/oauth/v2/token",
        data=token_data,
        auth=(EPIC_CLIENT_ID, EPIC_CLIENT_SECRET),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    if token_res.status_code != 200:
        return redirect("/?epic=error")
    token_json = token_res.json()
    access_token = token_json.get("access_token")
    account_id = token_json.get("account_id")

    display_name = account_id
    account_res = requests.get(
        "https://api.epicgames.dev/epic/id/v2/accounts",
        params={"accountId": account_id},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if account_res.status_code == 200:
        accounts = account_res.json()
        if accounts:
            display_name = accounts[0].get("displayName", account_id)

    conn = get_db()
    conn.execute(
        """
        INSERT INTO epic_connections (user_id, epic_account_id, display_name)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            epic_account_id = excluded.epic_account_id,
            display_name = excluded.display_name,
            connected_at = CURRENT_TIMESTAMP
        """,
        (user_id, account_id, display_name),
    )
    conn.commit()
    conn.close()

    return redirect("/?epic=connected")


@app.route("/api/connections")
@login_required
def api_connections():
    user_id = session.get("user_id")
    discord_data = None
    epic_data = None
    if user_id:
        conn = get_db()
        row = conn.execute(
            "SELECT discord_id, username FROM discord_connections WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if row:
            discord_data = {
                "connected": True,
                "username": row["username"],
                "discordId": row["discord_id"],
            }
        row = conn.execute(
            "SELECT epic_account_id, display_name FROM epic_connections WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if row:
            epic_data = {
                "connected": True,
                "username": row["display_name"],
                "epicAccountId": row["epic_account_id"],
            }
        conn.close()
    return jsonify({"discord": discord_data, "epic": epic_data})


@app.route("/api/discord/disconnect", methods=["POST"])
@login_required
def api_discord_disconnect():
    return jsonify({"error": "Discord ist deine Anmeldemethode und kann nicht getrennt werden."}), 400


@app.route("/api/epic/disconnect", methods=["POST"])
@login_required
def api_epic_disconnect():
    user_id = session["user_id"]
    conn = get_db()
    conn.execute("DELETE FROM epic_connections WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/profile")
@login_required
def api_profile():
    user_id = session["user_id"]
    conn = get_db()
    username = get_or_create_username(conn, user_id)
    conn.close()
    return jsonify({"userId": user_id, "username": username})


@app.route("/api/profile", methods=["POST"])
@login_required
def api_profile_update():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    if not USERNAME_RE.match(username):
        return jsonify({"error": "Anzeigename muss 3-20 Zeichen sein (Buchstaben, Zahlen, _)."}), 400

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?",
        (username, user_id),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Dieser Anzeigename ist bereits vergeben."}), 409

    conn.execute("UPDATE users SET username = ? WHERE id = ?", (username, user_id))
    conn.commit()
    conn.close()
    return jsonify({"username": username})


@app.route("/api/players/search")
@login_required
def api_players_search():
    user_id = session["user_id"]
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"players": []})

    conn = get_db()
    rows = conn.execute(
        """
        SELECT id, username FROM users
        WHERE username LIKE ? AND id != ? AND username IS NOT NULL
        ORDER BY username ASC
        LIMIT 20
        """,
        (f"%{query}%", user_id),
    ).fetchall()
    conn.close()
    return jsonify({"players": [{"id": r["id"], "username": r["username"]} for r in rows]})


@app.route("/api/teams")
@login_required
def api_teams_list():
    user_id = session["user_id"]
    conn = get_db()
    rows = conn.execute(
        """
        SELECT teams.* FROM teams
        JOIN team_members ON team_members.team_id = teams.id
        WHERE team_members.user_id = ?
        ORDER BY teams.created_at ASC
        """,
        (user_id,),
    ).fetchall()
    teams = [serialize_team(conn, row, user_id) for row in rows]
    conn.close()
    return jsonify({"teams": teams})


@app.route("/api/teams", methods=["POST"])
@login_required
def api_teams_create():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    icon = (data.get("icon") or "🛡️").strip() or "🛡️"
    size = data.get("size")

    if not name or len(name) > 25:
        return jsonify({"error": "Bitte gib einen gültigen Teamnamen ein (max. 25 Zeichen)."}), 400
    if size not in (2, 3, 4):
        return jsonify({"error": "Ungültige Teamgröße."}), 400

    conn = get_db()
    get_or_create_username(conn, user_id)
    cur = conn.execute(
        "INSERT INTO teams (name, icon, size, owner_id) VALUES (?, ?, ?, ?)",
        (name, icon, size, user_id),
    )
    team_id = cur.lastrowid
    conn.execute(
        "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)",
        (team_id, user_id),
    )
    conn.commit()

    invite_usernames = data.get("inviteUsernames") or []
    invited = []
    failed = []
    for raw_username in invite_usernames:
        target_username = (raw_username or "").strip()
        target = conn.execute(
            "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
            (target_username,),
        ).fetchone()
        if not target or target["id"] == user_id:
            failed.append(target_username)
            continue
        conn.execute(
            "INSERT INTO team_invites (team_id, invited_user_id, invited_by) VALUES (?, ?, ?)",
            (team_id, target["id"], user_id),
        )
        invited.append(target_username)
    conn.commit()

    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    team = serialize_team(conn, team_row, user_id)
    conn.close()
    return jsonify({"team": team, "invited": invited, "failed": failed})


@app.route("/api/teams/<int:team_id>/invite", methods=["POST"])
@login_required
def api_teams_invite(team_id):
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    target_username = (data.get("username") or "").strip()

    conn = get_db()
    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    if not team_row:
        conn.close()
        return jsonify({"error": "Team nicht gefunden."}), 404
    if team_row["owner_id"] != user_id:
        conn.close()
        return jsonify({"error": "Nur der Team-Owner kann Spieler einladen."}), 403

    member_count = conn.execute(
        "SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?", (team_id,)
    ).fetchone()["c"]
    if member_count >= team_row["size"]:
        conn.close()
        return jsonify({"error": "Team ist bereits voll."}), 400

    target = conn.execute(
        "SELECT id FROM users WHERE username = ? COLLATE NOCASE", (target_username,)
    ).fetchone()
    if not target:
        conn.close()
        return jsonify({"error": "Spieler nicht gefunden."}), 404
    if target["id"] == user_id:
        conn.close()
        return jsonify({"error": "Du kannst dich nicht selbst einladen."}), 400

    already_member = conn.execute(
        "SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?",
        (team_id, target["id"]),
    ).fetchone()
    if already_member:
        conn.close()
        return jsonify({"error": "Spieler ist bereits im Team."}), 400

    already_invited = conn.execute(
        "SELECT 1 FROM team_invites WHERE team_id = ? AND invited_user_id = ?",
        (team_id, target["id"]),
    ).fetchone()
    if already_invited:
        conn.close()
        return jsonify({"error": "Einladung wurde bereits gesendet."}), 400

    conn.execute(
        "INSERT INTO team_invites (team_id, invited_user_id, invited_by) VALUES (?, ?, ?)",
        (team_id, target["id"], user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/teams/<int:team_id>/leave", methods=["POST"])
@login_required
def api_teams_leave(team_id):
    user_id = session["user_id"]
    conn = get_db()
    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    if not team_row:
        conn.close()
        return jsonify({"error": "Team nicht gefunden."}), 404

    if team_row["owner_id"] == user_id:
        conn.close()
        return jsonify({"error": "Als Team-Owner kannst du das Team nur auflösen."}), 400

    conn.execute(
        "DELETE FROM team_members WHERE team_id = ? AND user_id = ?", (team_id, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/teams/<int:team_id>", methods=["DELETE"])
@login_required
def api_teams_delete(team_id):
    user_id = session["user_id"]
    conn = get_db()
    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    if not team_row:
        conn.close()
        return jsonify({"error": "Team nicht gefunden."}), 404
    if team_row["owner_id"] != user_id:
        conn.close()
        return jsonify({"error": "Nur der Team-Owner kann das Team auflösen."}), 403

    conn.execute("DELETE FROM team_invites WHERE team_id = ?", (team_id,))
    conn.execute("DELETE FROM team_members WHERE team_id = ?", (team_id,))
    conn.execute("DELETE FROM teams WHERE id = ?", (team_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/invites")
@login_required
def api_invites_list():
    user_id = session["user_id"]
    conn = get_db()
    rows = conn.execute(
        """
        SELECT team_invites.id AS invite_id, teams.id AS team_id, teams.name AS team_name,
               teams.icon AS team_icon, users.username AS invited_by_username
        FROM team_invites
        JOIN teams ON teams.id = team_invites.team_id
        JOIN users ON users.id = team_invites.invited_by
        WHERE team_invites.invited_user_id = ?
        ORDER BY team_invites.created_at ASC
        """,
        (user_id,),
    ).fetchall()
    conn.close()
    return jsonify(
        {
            "invites": [
                {
                    "id": r["invite_id"],
                    "teamId": r["team_id"],
                    "teamName": r["team_name"],
                    "teamIcon": r["team_icon"],
                    "invitedBy": r["invited_by_username"],
                }
                for r in rows
            ]
        }
    )


@app.route("/api/invites/<int:invite_id>/accept", methods=["POST"])
@login_required
def api_invites_accept(invite_id):
    user_id = session["user_id"]
    conn = get_db()
    invite = conn.execute(
        "SELECT * FROM team_invites WHERE id = ? AND invited_user_id = ?",
        (invite_id, user_id),
    ).fetchone()
    if not invite:
        conn.close()
        return jsonify({"error": "Einladung nicht gefunden."}), 404

    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (invite["team_id"],)).fetchone()
    if not team_row:
        conn.execute("DELETE FROM team_invites WHERE id = ?", (invite_id,))
        conn.commit()
        conn.close()
        return jsonify({"error": "Team existiert nicht mehr."}), 404

    member_count = conn.execute(
        "SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?", (team_row["id"],)
    ).fetchone()["c"]
    if member_count >= team_row["size"]:
        conn.close()
        return jsonify({"error": "Team ist bereits voll."}), 400

    conn.execute(
        "INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)",
        (team_row["id"], user_id),
    )
    conn.execute("DELETE FROM team_invites WHERE id = ?", (invite_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/invites/<int:invite_id>/decline", methods=["POST"])
@login_required
def api_invites_decline(invite_id):
    user_id = session["user_id"]
    conn = get_db()
    invite = conn.execute(
        "SELECT * FROM team_invites WHERE id = ? AND invited_user_id = ?",
        (invite_id, user_id),
    ).fetchone()
    if not invite:
        conn.close()
        return jsonify({"error": "Einladung nicht gefunden."}), 404
    conn.execute("DELETE FROM team_invites WHERE id = ?", (invite_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
