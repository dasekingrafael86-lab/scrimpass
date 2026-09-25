import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import subprocess
import threading
import urllib.parse
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

import requests
import stripe
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_file, send_from_directory, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.utils import secure_filename

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "scrimpass.db"
STATIC_DIR = BASE_DIR / "static"
CLIENT_DIR = BASE_DIR / "client"
# Die fertig gebaute Windows-.exe (siehe client/README.md, "Als .exe bauen") —
# PyInstaller legt sie standardmäßig genau hier ab.
CLIENT_EXE_PATH = CLIENT_DIR / "dist" / "ScrimPassClient.exe"
# Muss von Hand zur CLIENT_VERSION in client/scrimpass_client.py passen und bei
# jedem neuen Build hochgezählt werden -- der laufende Client vergleicht das
# beim Sync gegen seine eigene Version und benachrichtigt sich sonst selbst
# über sein Tray-Icon (kein automatisches Update, nur ein Hinweis).
CLIENT_LATEST_VERSION = "1.0.0"
# Öffentliche Adresse dieses Servers (z. B. https://scrimpass.onrender.com).
# Wird beim Client-Download in den Dateinamen eingebettet, damit der Client
# ohne Einstellungen weiß, wohin er sich verbinden soll. Leer = Adresse aus
# der aktuellen Anfrage (reicht lokal, hinter einem Proxy bitte setzen).
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")

# Beweisfotos zu Cheat-Meldungen. WICHTIG: liegt wie scrimpass.db auf dem lokalen
# Dateisystem — auf Render-Free-Tier ohne Persistent Disk gehen diese beim
# Neustart verloren, siehe README.
UPLOADS_DIR = BASE_DIR / "uploads" / "reports"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

# Nur temporäre Ablage für hochgeladene Fortnite-Replay-Dateien — werden nach
# der Auswertung wieder gelöscht (siehe process_replay_async), es sammelt sich
# also nichts dauerhaft Großes an.
REPLAYS_DIR = BASE_DIR / "uploads" / "replays"
REPLAYS_DIR.mkdir(parents=True, exist_ok=True)
# Manuelle Web-Uploads (Fallback-Feature) bleiben dagegen dauerhaft liegen,
# damit Admins sie im Admin-Bereich nachträglich einsehen/herunterladen können.
MANUAL_REPLAYS_DIR = BASE_DIR / "uploads" / "manual_replays"
MANUAL_REPLAYS_DIR.mkdir(parents=True, exist_ok=True)
REPLAY_PARSER_SCRIPT = BASE_DIR / "replay_parser" / "parse_replay.js"
# Auf Render installiert der Build-Befehl Node lokal unter ./node-runtime
# (der Render-eigene Node-Buildpack auf dem PATH zur Laufzeit ist nicht
# garantiert verfügbar) -- lokal in der Entwicklung reicht das system-eigene
# "node" auf dem PATH.
_NODE_LOCAL = BASE_DIR / "node-runtime" / "bin" / "node"
NODE_BIN = str(_NODE_LOCAL) if _NODE_LOCAL.exists() else "node"

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

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
)

ADMIN_USER_IDS = {
    uid.strip() for uid in os.environ.get("ADMIN_USER_IDS", "").split(",") if uid.strip()
}

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
stripe.api_key = STRIPE_SECRET_KEY

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.permanent_session_lifetime = timedelta(days=30)

# Globales Limit für die Request-Größe. Flask 3.x macht request.max_content_length
# schreibgeschützt (immer die App-Config, kein Pro-Route-Override möglich), daher
# hier hoch genug für die größte tatsächlich vorkommende Upload-Art gesetzt:
# Fortnite-Replay-Dateien für die Ergebnis-Auswertung (oft 50-200+ MB), Cheat-
# Melde-Fotos brauchen selbst nur wenige MB und bleiben durch
# ALLOWED_IMAGE_EXTENSIONS ohnehin auf Bilddateien beschränkt.
app.config["MAX_CONTENT_LENGTH"] = 350 * 1024 * 1024
# Session-Cookie absichern: JS darf nicht drauf zugreifen (ohnehin Flask-Default,
# hier explizit) und nicht bei plattformübergreifenden Requests mitschicken. Secure
# (nur über HTTPS senden) standardmäßig AUS, weil sonst der lokale Dev-Server über
# http://localhost keine Login-Cookies mehr setzen könnte — im Produktivbetrieb
# (Render, echte Domain mit HTTPS) SESSION_COOKIE_SECURE=1 in der Umgebung setzen.
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "0") == "1"

# Schutz gegen Missbrauch/Spam: ein Grundlimit pro IP für alles, plus engere Grenzen
# für einzelne, besonders empfindliche Endpunkte (siehe jeweils @limiter.limit dort).
# Zählt im Speicher des einzelnen Prozesses — für mehrere Worker/Dynos bräuchte es
# einen gemeinsamen Speicher (storage_uri="redis://...", siehe Flask-Limiter-Doku).
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour", "40 per minute"])

# Symmetric key for encrypting bank details at rest, derived from SECRET_KEY so no
# extra env var is needed. Never used for anything session/auth related.
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(app.secret_key.encode()).digest()))


def encrypt_secret(value):
    return _fernet.encrypt(value.encode()).decode()


def decrypt_secret(value):
    return _fernet.decrypt(value.encode()).decode()


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def parse_iso(value):
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def format_euro_cents(cents):
    return f"{cents / 100:.2f}".replace(".", ",") + "€"


# Masterclass-Pläne: einmaliger Kauf über Stripe Checkout, zeitlich begrenzter
# Zugriff (siehe README). Die Auszahlung von Guthaben an Spieler ist weiterhin nur
# als Datenbank-Eintrag mit manueller Admin-Freigabe vorbereitet, es wird kein Geld
# automatisch überwiesen.
PLANS = {
    "Schnell-Angebot": {"price_cents": 299, "days": 2, "dropmaps": 3, "snipes": 0, "grant_credits": 2},
    "Kleines Angebot": {"price_cents": 649, "days": 7, "dropmaps": 5, "snipes": 2, "grant_credits": 6},
    "Großes Angebot": {"price_cents": 999, "days": 10, "dropmaps": 7, "snipes": 5, "grant_credits": 10},
}

# Kauf mit Guthaben statt Karte: derselbe Plan, aber diesen Betrag günstiger als
# der Einmalkauf über Stripe — einmalig, keine automatische Abbuchung.
GUTHABEN_DISCOUNT_CENTS = 50

PRIZE_BREAKDOWN = {1: 50, 2: 30, 3: 20, 4: 15, 5: 10, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5}
PRIZE_POOL = sum(PRIZE_BREAKDOWN.values())


def infer_missing_placement(participant_rows, team_size):
    """Wenn in einer Runde für alle bis auf ein Team/eine Person schon eine
    Platzierung bekannt ist (z.B. vom SP-Client gemeldet) und diese bekannten
    Platzierungen lückenlos 1..T minus genau einer Zahl abdecken (T = Anzahl
    Teams/Spieler in der Runde), dann ist die fehlende Platzierung mathematisch
    eindeutig — z.B. wenn 7 von 8 Spielern eine Platzierung zwischen 1 und 8
    gemeldet haben, muss der 8. Spieler zwangsläufig die übrige Zahl haben,
    selbst wenn er vergessen hat, den Client zu aktivieren. Das greift bewusst
    NUR, wenn genau eine Lücke übrig ist — bei mehreren fehlenden Platzierungen
    wäre nicht eindeutig, wem welcher Wert zusteht, also raten wir dann nicht.
    Gibt {user_id: platzierung} nur für die derart herleitbaren Spieler zurück."""
    accepted = [p for p in participant_rows if p["status"] == "accepted"]
    groups = {}
    if team_size > 1:
        for p in accepted:
            if p["team_id"] is None:
                continue
            groups.setdefault(p["team_id"], []).append(p)
    else:
        for p in accepted:
            groups.setdefault(p["user_id"], []).append(p)

    total = len(groups)
    if total < 2:
        return {}

    known_values = []
    missing_group = None
    for members in groups.values():
        placement = members[0]["placement"]
        if placement is None:
            if missing_group is not None:
                return {}
            missing_group = members
        else:
            known_values.append(placement)

    if missing_group is None or len(set(known_values)) != len(known_values):
        return {}

    missing_values = set(range(1, total + 1)) - set(known_values)
    if len(missing_values) != 1:
        return {}

    inferred_placement = missing_values.pop()
    return {member["user_id"]: inferred_placement for member in missing_group}

SHOP_ITEMS = {
    "Zufällige Dropmap": 2,
    "Snipe": 5,
    "Early Access": 5,
}


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
    try:
        conn.execute("ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN ban_reason TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN banned_at TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN avatar_id TEXT")
    except sqlite3.OperationalError:
        pass
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
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS google_connections (
            user_id TEXT PRIMARY KEY,
            google_sub TEXT NOT NULL,
            email TEXT,
            name TEXT,
            picture TEXT,
            connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    try:
        conn.execute("ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN snipes INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN guthaben_cents INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            reason TEXT NOT NULL,
            meta TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS guthaben_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            amount_cents INTEGER NOT NULL,
            reason TEXT NOT NULL,
            meta TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            plan_key TEXT NOT NULL,
            purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            credits_converted INTEGER NOT NULL DEFAULT 0,
            stripe_session_id TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    try:
        conn.execute("ALTER TABLE user_plans ADD COLUMN credits_converted INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE user_plans ADD COLUMN stripe_session_id TEXT")
    except sqlite3.OperationalError:
        pass
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_stripe_session "
        "ON user_plans(stripe_session_id) WHERE stripe_session_id IS NOT NULL"
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scrim_rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mode TEXT NOT NULL DEFAULT 'Solo Battle Royale',
            region TEXT NOT NULL DEFAULT 'EU',
            starts_at TEXT NOT NULL,
            max_players INTEGER NOT NULL DEFAULT 100,
            min_players INTEGER NOT NULL DEFAULT 65,
            entry_fee INTEGER NOT NULL DEFAULT 2,
            team_size INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            cancelled_at TEXT
        )
        """
    )
    try:
        conn.execute("ALTER TABLE scrim_rounds ADD COLUMN min_players INTEGER NOT NULL DEFAULT 65")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_rounds ADD COLUMN match_code TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_rounds ADD COLUMN cancelled_at TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_rounds ADD COLUMN team_size INTEGER NOT NULL DEFAULT 1")
    except sqlite3.OperationalError:
        pass
    try:
        # Gesetzt, sobald für die Runde nachweislich jemand Platz 1 erreicht
        # hat (Client-Meldung oder Replay-Auswertung) -- das zuverlässigste
        # Signal, dass das Match wirklich vorbei ist. Löst den automatischen
        # Rundenabschluss ROUND_AUTO_COMPLETE_DELAY später aus.
        conn.execute("ALTER TABLE scrim_rounds ADD COLUMN finished_at TEXT")
    except sqlite3.OperationalError:
        pass
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scrim_participants (
            round_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
            entry_paid INTEGER NOT NULL DEFAULT 0,
            placement INTEGER,
            credits_won INTEGER,
            team_id INTEGER,
            status TEXT NOT NULL DEFAULT 'accepted',
            PRIMARY KEY(round_id, user_id),
            FOREIGN KEY(round_id) REFERENCES scrim_rounds(id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(team_id) REFERENCES teams(id)
        )
        """
    )
    try:
        conn.execute("ALTER TABLE scrim_participants ADD COLUMN team_id INTEGER")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_participants ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted'")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_participants ADD COLUMN checked_in_at TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_participants ADD COLUMN auto_reported INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE scrim_participants ADD COLUMN replay_placement INTEGER")
    except sqlite3.OperationalError:
        pass
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS client_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            label TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_used_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS client_pair_codes (
            code TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS payout_bank_details (
            user_id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            address_line1 TEXT NOT NULL,
            address_line2 TEXT,
            city TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL,
            iban_encrypted TEXT NOT NULL,
            bic_encrypted TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS payout_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            amount_cents INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    try:
        conn.execute("ALTER TABLE payout_requests ADD COLUMN paid_by TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE payout_requests ADD COLUMN paid_at TEXT")
    except sqlite3.OperationalError:
        pass
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cheat_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_user_id TEXT NOT NULL,
            reported_name TEXT NOT NULL,
            description TEXT,
            clip_link TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(reporter_user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cheat_report_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            FOREIGN KEY(report_id) REFERENCES cheat_reports(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS payout_bank_detail_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payout_request_id INTEGER NOT NULL,
            admin_user_id TEXT NOT NULL,
            viewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(payout_request_id) REFERENCES payout_requests(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS manual_replay_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            original_filename TEXT,
            stored_path TEXT NOT NULL,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'pending',
            detail TEXT,
            FOREIGN KEY(round_id) REFERENCES scrim_rounds(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS round_problem_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(round_id) REFERENCES scrim_rounds(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.commit()
    conn.close()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Nicht angemeldet."}), 401
        # Guards against a stale session cookie outliving the database (e.g. a
        # free-tier host resetting its ephemeral disk while sessions persist).
        conn = get_db()
        conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (user_id,))
        conn.commit()
        row = conn.execute("SELECT banned, ban_reason FROM users WHERE id = ?", (user_id,)).fetchone()
        if row and row["banned"]:
            conn.close()
            return jsonify({"error": "Dein Konto wurde gesperrt.", "banReason": row["ban_reason"]}), 403
        settle_expired_plan_if_needed(conn, user_id)
        settle_expired_rounds_if_needed(conn)
        settle_finished_rounds_if_needed(conn)
        conn.close()
        return view(*args, **kwargs)
    return wrapped


def optional_login(view):
    """Wie login_required, aber lässt Gäste (ohne Session) durch — für
    Endpunkte, die man auch ohne Anmeldung ansehen können soll (z. B. die
    Scrim-Runden-Liste). Der View bekommt session.get("user_id") == None."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        conn = get_db()
        if user_id:
            conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (user_id,))
            conn.commit()
            row = conn.execute("SELECT banned, ban_reason FROM users WHERE id = ?", (user_id,)).fetchone()
            if row and row["banned"]:
                conn.close()
                return jsonify({"error": "Dein Konto wurde gesperrt.", "banReason": row["ban_reason"]}), 403
            settle_expired_plan_if_needed(conn, user_id)
        settle_expired_rounds_if_needed(conn)
        settle_finished_rounds_if_needed(conn)
        conn.close()
        return view(*args, **kwargs)
    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Nicht angemeldet."}), 401
        if user_id not in ADMIN_USER_IDS:
            return jsonify({"error": "Kein Zugriff."}), 403
        conn = get_db()
        conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (user_id,))
        conn.commit()
        settle_expired_plan_if_needed(conn, user_id)
        settle_expired_rounds_if_needed(conn)
        settle_finished_rounds_if_needed(conn)
        conn.close()
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


def get_credits(conn, user_id):
    row = conn.execute("SELECT credits FROM users WHERE id = ?", (user_id,)).fetchone()
    return row["credits"] if row else 0


def add_credits(conn, user_id, amount, reason, meta=None):
    """Adjusts a user's credit balance and logs the change. amount may be negative."""
    conn.execute("UPDATE users SET credits = credits + ? WHERE id = ?", (amount, user_id))
    conn.execute(
        "INSERT INTO credit_transactions (user_id, amount, reason, meta) VALUES (?, ?, ?, ?)",
        (user_id, amount, reason, meta),
    )


def get_snipes(conn, user_id):
    row = conn.execute("SELECT snipes FROM users WHERE id = ?", (user_id,)).fetchone()
    return row["snipes"] if row else 0


def add_snipes(conn, user_id, amount):
    conn.execute("UPDATE users SET snipes = snipes + ? WHERE id = ?", (amount, user_id))


def get_guthaben_cents(conn, user_id):
    row = conn.execute("SELECT guthaben_cents FROM users WHERE id = ?", (user_id,)).fetchone()
    return row["guthaben_cents"] if row else 0


def add_guthaben_cents(conn, user_id, amount_cents, reason, meta=None):
    """Adjusts a user's real-money-equivalent balance (in cents) and logs it."""
    conn.execute(
        "UPDATE users SET guthaben_cents = guthaben_cents + ? WHERE id = ?", (amount_cents, user_id)
    )
    conn.execute(
        "INSERT INTO guthaben_transactions (user_id, amount_cents, reason, meta) VALUES (?, ?, ?, ?)",
        (user_id, amount_cents, reason, meta),
    )


def settle_expired_plan_if_needed(conn, user_id):
    """
    Wenn der zuletzt gekaufte Plan abgelaufen und noch nicht abgerechnet ist,
    werden verbleibende Credits 1:1 in Guthaben (Cent) umgewandelt und die
    Credits auf 0 gesetzt. So werden nur Credits ausgezahlt, die unter einem
    (ggf. inzwischen abgelaufenen) Masterclass-Plan verdient wurden.
    """
    row = conn.execute(
        "SELECT * FROM user_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    if not row or row["credits_converted"]:
        return
    if parse_iso(row["expires_at"]) > datetime.now(timezone.utc):
        return

    credits = get_credits(conn, user_id)
    if credits > 0:
        add_credits(conn, user_id, -credits, "plan_expired_conversion", row["plan_key"])
        add_guthaben_cents(conn, user_id, credits * 100, "plan_expired_conversion", row["plan_key"])
    conn.execute("UPDATE user_plans SET credits_converted = 1 WHERE id = ?", (row["id"],))
    conn.commit()


def settle_expired_rounds_if_needed(conn):
    """
    Läuft die Startzeit einer offenen Runde ab, ohne dass die Mindestteilnehmerzahl
    erreicht wurde (und ohne dass ein Admin die Runde per „Verschieben" auf eine
    neue Startzeit verlegt hat), wird die Runde automatisch storniert: alle bereits
    gezahlten Teilnahmegebühren werden über den Transaktionsverlauf zurückerstattet.
    Kein Cronjob nötig — wird bei jedem authentifizierten Request lazy geprüft.
    """
    now = datetime.now(timezone.utc)
    rounds = conn.execute("SELECT * FROM scrim_rounds WHERE status = 'open'").fetchall()
    for round_row in rounds:
        if parse_iso(round_row["starts_at"]) > now:
            continue
        round_id = round_row["id"]
        player_count = conn.execute(
            "SELECT COUNT(*) AS c FROM scrim_participants WHERE round_id = ?", (round_id,)
        ).fetchone()["c"]
        if player_count >= round_row["min_players"]:
            continue

        payments = conn.execute(
            "SELECT user_id, amount FROM credit_transactions "
            "WHERE reason IN ('match_entry', 'match_entry_team') AND meta = ?",
            (str(round_id),),
        ).fetchall()
        for p in payments:
            refund = -p["amount"]
            if refund > 0:
                add_credits(conn, p["user_id"], refund, "match_cancelled_refund", str(round_id))

        conn.execute("DELETE FROM scrim_participants WHERE round_id = ?", (round_id,))
        conn.execute(
            "UPDATE scrim_rounds SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
            (now_iso(), round_id),
        )
    conn.commit()


def _mark_round_finished_if_winner_known(conn, round_id):
    """Setzt scrim_rounds.finished_at (einmalig), sobald für diese Runde
    irgendein Teilnehmer nachweislich Platz 1 erreicht hat (eigene
    Client-Meldung ODER Replay-Auswertung) -- ein Fortnite-BR-Match ist per
    Definition erst vorbei, wenn jemand gewinnt, das ist also das
    zuverlässigste automatische "Runde zu Ende"-Signal. Löst darüber den
    Auto-Abschluss-Countdown aus (siehe settle_finished_rounds_if_needed).
    Muss vor dem conn.commit() der aufrufenden Funktion laufen, committet
    selbst nicht."""
    round_row = conn.execute(
        "SELECT finished_at FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row or round_row["finished_at"]:
        return
    winner = conn.execute(
        "SELECT 1 FROM scrim_participants WHERE round_id = ? AND status = 'accepted' "
        "AND (placement = 1 OR replay_placement = 1) LIMIT 1",
        (round_id,),
    ).fetchone()
    if winner:
        conn.execute("UPDATE scrim_rounds SET finished_at = ? WHERE id = ?", (now_iso(), round_id))


def resolve_round_placements(conn, round_row):
    """Liefert (participants, resolve) für eine Runde: participants sind die
    rohen Teilnehmer-Zeilen (inkl. users/teams-Join), resolve(p) liefert je
    Teilnehmer (placement, source) nach Priorität eigene Meldung (Client) >
    Replay-Auswertung > rein rechnerische Lücken-Herleitung. Gemeinsam
    verwendet von der Admin-Detailansicht und dem automatischen
    Rundenabschluss, damit beide exakt dieselben Platzierungen sehen."""
    participants = conn.execute(
        """
        SELECT scrim_participants.*, users.username AS username, users.banned AS banned,
               teams.name AS team_name
        FROM scrim_participants
        JOIN users ON users.id = scrim_participants.user_id
        LEFT JOIN teams ON teams.id = scrim_participants.team_id
        WHERE round_id = ?
        ORDER BY teams.name ASC, users.username ASC
        """,
        (round_row["id"],),
    ).fetchall()

    inferred = {}
    if round_row["status"] == "open":
        inferred = infer_missing_placement(participants, round_row["team_size"])

    def resolve(p):
        # Priorität, wenn mehrere Quellen vorliegen: Client-Meldung (kann nur
        # gesetzt sein, solange die Runde offen ist) > Replay-Auswertung >
        # rein rechnerische Lücken-Herleitung.
        if p["placement"] is not None:
            return p["placement"], "client"
        if p["replay_placement"] is not None:
            return p["replay_placement"], "replay"
        if p["user_id"] in inferred:
            return inferred[p["user_id"]], "inferred"
        return None, None

    return participants, resolve


def _finalize_round_automatically(conn, round_row):
    """Schließt eine Runde ohne Admin-Bestätigung ab: übernimmt für jeden
    Teilnehmer die per resolve_round_placements aufgelöste Platzierung,
    vergibt Credits und markiert die Runde als abgeschlossen. Wird sowohl
    von settle_finished_rounds_if_needed (Auto-Abschluss) verwendet."""
    round_id = round_row["id"]
    participants, resolve = resolve_round_placements(conn, round_row)
    for p in participants:
        if p["status"] != "accepted":
            continue
        placement, _source = resolve(p)
        if placement is None:
            continue
        credits_won = PRIZE_BREAKDOWN.get(placement, 0)
        delta = credits_won - (p["credits_won"] or 0)
        conn.execute(
            "UPDATE scrim_participants SET placement = ?, credits_won = ? WHERE round_id = ? AND user_id = ?",
            (placement, credits_won, round_id, p["user_id"]),
        )
        if delta != 0:
            add_credits(conn, p["user_id"], delta, "match_reward", str(round_id))
    conn.execute(
        "UPDATE scrim_rounds SET status = 'completed', completed_at = ? WHERE id = ?",
        (now_iso(), round_id),
    )


def settle_finished_rounds_if_needed(conn):
    """Schließt Runden automatisch ab (ohne Admin-Bestätigung), sobald
    ROUND_AUTO_COMPLETE_DELAY seit finished_at vergangen ist. Kein Cronjob
    nötig -- wird wie settle_expired_rounds_if_needed bei jedem
    authentifizierten Request lazy geprüft."""
    now = datetime.now(timezone.utc)
    rounds = conn.execute(
        "SELECT * FROM scrim_rounds WHERE status = 'open' AND finished_at IS NOT NULL"
    ).fetchall()
    for round_row in rounds:
        if parse_iso(round_row["finished_at"]) + ROUND_AUTO_COMPLETE_DELAY > now:
            continue
        _finalize_round_automatically(conn, round_row)
    conn.commit()


def get_active_plan(conn, user_id):
    row = conn.execute(
        "SELECT * FROM user_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    if not row:
        return None
    if parse_iso(row["expires_at"]) <= datetime.now(timezone.utc):
        return None
    plan_info = PLANS.get(row["plan_key"], {})
    return {
        "name": row["plan_key"],
        "purchasedAt": row["purchased_at"],
        "expiresAt": row["expires_at"],
        "dropmaps": plan_info.get("dropmaps", 0),
        "snipes": plan_info.get("snipes", 0),
    }


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
    if session.get("user_id"):
        conn = get_db()
        row = conn.execute("SELECT banned FROM users WHERE id = ?", (session["user_id"],)).fetchone()
        conn.close()
        if row and row["banned"]:
            return redirect("/gesperrt")
    # Kein Login-Zwang mehr: Gäste dürfen sich frei umschauen (Scrim-Runden,
    # Regeln, Preise ansehen). Erst Aktionen, die eine Anmeldung brauchen
    # (z. B. einer Runde beitreten), sind hinter login_required und schicken
    # den Nutzer bei Bedarf zu /login.
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/gesperrt")
def banned_page():
    if not session.get("user_id"):
        return redirect("/login")
    conn = get_db()
    row = conn.execute("SELECT banned, ban_reason FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    conn.close()
    if not row or not row["banned"]:
        return redirect("/")
    return send_from_directory(STATIC_DIR, "gesperrt.html")


@app.route("/login")
def login_page():
    if session.get("user_id"):
        return redirect("/")
    return send_from_directory(STATIC_DIR, "login.html")


@app.route("/admin")
def admin_page():
    if not session.get("user_id"):
        return redirect("/login")
    if session["user_id"] not in ADMIN_USER_IDS:
        return redirect("/")
    return send_from_directory(STATIC_DIR, "admin.html")


@app.route("/impressum")
def impressum_page():
    return send_from_directory(STATIC_DIR, "impressum.html")


@app.route("/datenschutz")
def datenschutz_page():
    return send_from_directory(STATIC_DIR, "datenschutz.html")


@app.route("/agb")
def agb_page():
    return send_from_directory(STATIC_DIR, "agb.html")


@app.route("/widerruf")
def widerruf_page():
    return send_from_directory(STATIC_DIR, "widerruf.html")


@app.route("/anleitung")
def howto_page():
    return send_from_directory(STATIC_DIR, "howto.html")


@app.route("/footer.js")
def footer_script():
    return send_from_directory(STATIC_DIR, "footer.js")


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/ban-status")
def api_ban_status():
    # Bewusst ohne login_required: genau dieser Endpunkt muss auch für gebannte
    # Nutzer funktionieren, damit die Sperr-Seite den Grund anzeigen kann.
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Nicht angemeldet."}), 401
    conn = get_db()
    row = conn.execute("SELECT banned, ban_reason, banned_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"banned": False})
    return jsonify({"banned": bool(row["banned"]), "reason": row["ban_reason"], "bannedAt": row["banned_at"]})


def oauth_redirect_uri(configured):
    """Im lokalen Test zeigt die konfigurierte Rückkehr-Adresse auf localhost.
    Wird die Seite aber von einem zweiten Gerät über die Netzwerk-Adresse dieses
    Rechners geöffnet, wäre "localhost" dort das falsche Gerät — dann gilt die
    tatsächlich aufgerufene Adresse. Produktiv (konfigurierte Adresse ist nicht
    localhost) bleibt alles unverändert. Der Anbieter akzeptiert ohnehin nur
    vorher bei ihm eingetragene Adressen."""
    parsed = urllib.parse.urlparse(configured)
    loopback = ("localhost", "127.0.0.1")
    if parsed.hostname in loopback and request.host.split(":")[0] not in loopback:
        return f"{request.scheme}://{request.host}{parsed.path}"
    return configured


@app.route("/auth/discord/login")
@limiter.limit("10 per minute")  # Login-Start, nicht der OAuth-Rücksprung
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
        "redirect_uri": oauth_redirect_uri(DISCORD_REDIRECT_URI),
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
            "redirect_uri": oauth_redirect_uri(DISCORD_REDIRECT_URI),
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


@app.route("/auth/google/login")
@limiter.limit("10 per minute")  # Login-Start, nicht der OAuth-Rücksprung
def google_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return (
            "Google-App ist noch nicht konfiguriert. Trage GOOGLE_CLIENT_ID und "
            "GOOGLE_CLIENT_SECRET in der .env-Datei ein (siehe README.md).",
            500,
        )
    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": oauth_redirect_uri(GOOGLE_REDIRECT_URI),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}")


@app.route("/auth/google/callback")
def google_callback():
    if request.args.get("error"):
        return redirect("/login?error=google")

    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state or state != session.get("oauth_state"):
        return redirect("/login?error=google")
    session.pop("oauth_state", None)

    token_res = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": oauth_redirect_uri(GOOGLE_REDIRECT_URI),
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    if token_res.status_code != 200:
        return redirect("/login?error=google")
    access_token = token_res.json().get("access_token")

    user_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if user_res.status_code != 200:
        return redirect("/login?error=google")
    google_user = user_res.json()
    google_sub = google_user.get("sub")
    if not google_sub:
        return redirect("/login?error=google")

    # Google ist die Anmeldemethode: users.id == "google_<sub>", damit keine
    # Kollision mit numerischen Discord-Snowflake-IDs entstehen kann.
    user_id = f"google_{google_sub}"
    conn = get_db()
    conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (user_id,))
    conn.execute(
        """
        INSERT INTO google_connections (user_id, google_sub, email, name, picture)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            google_sub = excluded.google_sub,
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture,
            connected_at = CURRENT_TIMESTAMP
        """,
        (
            user_id,
            google_sub,
            google_user.get("email"),
            google_user.get("name"),
            google_user.get("picture"),
        ),
    )
    conn.commit()
    conn.close()

    session.permanent = True
    session["user_id"] = user_id
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


AVATAR_IDS = {
    "phantom", "ninja", "soldier", "gamer", "cyber", "scout", "pilot", "reaper",
    "assassin", "knight", "berserker", "alien", "wizard", "streamer",
    "samurai", "detective", "astronaut", "viking", "robot", "skeleton",
    "demon", "medic", "sniper", "king",
}


@app.route("/api/profile")
@login_required
def api_profile():
    user_id = session["user_id"]
    conn = get_db()
    username = get_or_create_username(conn, user_id)
    credits = get_credits(conn, user_id)
    snipes = get_snipes(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    avatar_row = conn.execute("SELECT avatar_id FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return jsonify({
        "userId": user_id,
        "username": username,
        "credits": credits,
        "snipes": snipes,
        "guthabenCents": guthaben_cents,
        "isAdmin": user_id in ADMIN_USER_IDS,
        "avatarId": avatar_row["avatar_id"] if avatar_row else None,
    })


@app.route("/api/profile/avatar", methods=["POST"])
@login_required
def api_profile_avatar():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    avatar_id = data.get("avatarId")
    if avatar_id not in AVATAR_IDS:
        return jsonify({"error": "Ungültiges Profilbild."}), 400
    conn = get_db()
    conn.execute("UPDATE users SET avatar_id = ? WHERE id = ?", (avatar_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "avatarId": avatar_id})


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
@limiter.limit("30 per minute")  # Autocomplete, kein Grund für hohe Frequenz
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


@app.route("/api/teams/<int:team_id>/members/<member_id>", methods=["DELETE"])
@login_required
def api_teams_remove_member(team_id, member_id):
    """Der Owner entfernt ein Mitglied (nicht sich selbst — dafür gibt es
    /leave bzw. /delete, um das Team komplett aufzulösen)."""
    user_id = session["user_id"]
    conn = get_db()
    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    if not team_row:
        conn.close()
        return jsonify({"error": "Team nicht gefunden."}), 404
    if team_row["owner_id"] != user_id:
        conn.close()
        return jsonify({"error": "Nur der Team-Owner kann Mitglieder entfernen."}), 403
    if member_id == user_id:
        conn.close()
        return jsonify({"error": "Als Owner kannst du dich nicht selbst entfernen — löse das Team stattdessen auf."}), 400

    member_row = conn.execute(
        "SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?", (team_id, member_id)
    ).fetchone()
    if not member_row:
        conn.close()
        return jsonify({"error": "Mitglied nicht gefunden."}), 404

    conn.execute("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", (team_id, member_id))
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


@app.route("/api/plan")
@login_required
def api_plan():
    user_id = session["user_id"]
    conn = get_db()
    plan = get_active_plan(conn, user_id)
    conn.close()
    return jsonify({"plan": plan})


def grant_plan(conn, user_id, offer, stripe_session_id, keep_credits=False):
    """Schreibt einen bezahlten Plan-Kauf in die DB. Wird ausschließlich nach
    verifizierter Stripe-Zahlung aufgerufen (Webhook oder Checkout-Session-
    Abfrage) — nie direkt vom Client. Über stripe_session_id idempotent:
    derselbe Checkout kann nicht zweimal gutgeschrieben werden (z.B. wenn
    sowohl der Webhook als auch die Rückkehr-Bestätigung greifen).
    keep_credits=True (nur bei automatischer Abo-Verlängerung): das bisherige
    Credit-Guthaben bleibt erhalten statt zurückgesetzt zu werden — sonst
    würden mit dem Plan erspielte, auszahlbare Credits bei jeder Verlängerung
    verfallen."""
    plan = PLANS.get(offer)
    if not plan:
        return None

    already = conn.execute(
        "SELECT 1 FROM user_plans WHERE stripe_session_id = ?", (stripe_session_id,)
    ).fetchone()
    if already:
        return get_active_plan(conn, user_id)

    # Läuft der aktuelle Plan noch, wird die neue Laufzeit auf die verbleibende
    # Zeit draufgerechnet (Stacking), statt sie zu überschreiben.
    existing_plan = get_active_plan(conn, user_id)
    base_time = datetime.now(timezone.utc)
    if existing_plan:
        existing_expires_at = parse_iso(existing_plan["expiresAt"])
        if existing_expires_at > base_time:
            base_time = existing_expires_at
    expires_at = (base_time + timedelta(days=plan["days"])).strftime("%Y-%m-%d %H:%M:%S")

    # Jeder Plan-Kauf setzt das Credit-Guthaben zurück, bevor die neuen Credits
    # gutgeschrieben werden. Verhindert, dass im Free-Tier (nicht auszahlbar)
    # erspielte Credits durch einen späteren Plan-Kauf auszahlungsfähig würden.
    existing_credits = get_credits(conn, user_id)
    if existing_credits > 0 and not keep_credits:
        add_credits(conn, user_id, -existing_credits, "credits_reset_on_purchase", offer)

    conn.execute(
        "INSERT INTO user_plans (user_id, plan_key, expires_at, stripe_session_id) VALUES (?, ?, ?, ?)",
        (user_id, offer, expires_at, stripe_session_id),
    )
    add_credits(conn, user_id, plan["grant_credits"], "plan_purchase", offer)
    add_snipes(conn, user_id, plan["snipes"])
    conn.commit()
    return get_active_plan(conn, user_id)


@app.route("/api/plans/checkout", methods=["POST"])
@login_required
def api_plans_checkout():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    offer = data.get("offer")
    plan = PLANS.get(offer)
    if not plan:
        return jsonify({"error": "Unbekanntes Angebot."}), 400
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "Zahlungsanbieter ist noch nicht konfiguriert."}), 503

    conn = get_db()
    username = get_or_create_username(conn, user_id)
    conn.close()

    base_url = request.url_root.rstrip("/")
    try:
        checkout_session = stripe.checkout.Session.create(
            mode="payment",
            # Keine payment_method_types fest verdrahten: Stripe zeigt dann automatisch
            # alle Zahlungsarten an, die im Dashboard (Einstellungen -> Zahlungsmethoden)
            # für den Account aktiviert sind (Karte, PayPal, Klarna, SEPA, ...). Neue
            # Zahlungsarten lassen sich so im Dashboard dazuschalten, ohne Code-Änderung
            # — und ein fest eingetragener, aber noch nicht aktivierter Typ würde sonst
            # den kompletten Checkout mit einem Fehler blockieren.
            customer_email=None,
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": f"ScrimPass Masterclass – {offer}"},
                    "unit_amount": plan["price_cents"],
                },
                "quantity": 1,
            }],
            client_reference_id=user_id,
            metadata={"user_id": user_id, "offer": offer, "username": username},
            success_url=f"{base_url}/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base_url}/?checkout=cancel",
        )
    except Exception:
        return jsonify({"error": "Checkout konnte nicht gestartet werden."}), 502

    return jsonify({"url": checkout_session.url})


# ==================== Mit Guthaben kaufen (einmalig, keine Abbuchung) ====================
# Derselbe Masterclass-Plan wie der Einmalkauf oben, aber bezahlt aus dem Guthaben
# (💶-Anzeige neben den Snipes — dem Betrag, den man sich zuvor im Shop aus Credits
# umgewandelt hat) statt mit Karte über Stripe, und dafür etwas günstiger. Rein
# einmalig: es wird nie automatisch erneut abgebucht, dafür gibt es hier bewusst
# keinen Cronjob/keine Verlängerungs-Logik wie bei den anderen settle_*-Funktionen.

def guthaben_price_cents(plan):
    return plan["price_cents"] - GUTHABEN_DISCOUNT_CENTS


@app.route("/api/guthaben/plans")
def api_guthaben_plans():
    return jsonify({
        "discountCents": GUTHABEN_DISCOUNT_CENTS,
        "plans": [
            {
                "name": name, "days": p["days"], "regularCents": p["price_cents"],
                "guthabenCents": guthaben_price_cents(p),
                "dropmaps": p["dropmaps"], "snipes": p["snipes"], "credits": p["grant_credits"],
            }
            for name, p in PLANS.items()
        ],
    })


@app.route("/api/guthaben/buy", methods=["POST"])
@login_required
def api_guthaben_buy():
    user_id = session["user_id"]
    offer = (request.get_json(silent=True) or {}).get("offer")
    plan = PLANS.get(offer)
    if not plan:
        return jsonify({"error": "Unbekanntes Angebot."}), 400

    conn = get_db()
    price = guthaben_price_cents(plan)
    if get_guthaben_cents(conn, user_id) < price:
        conn.close()
        return jsonify({"error": f"Nicht genug Guthaben — {format_euro_cents(price)} nötig. "
                                  f"Wandle im Shop weitere Credits in Guthaben um."}), 402

    add_guthaben_cents(conn, user_id, -price, "plan_purchase_guthaben", offer)
    active_plan = grant_plan(conn, user_id, offer, f"guthaben_{user_id}_{secrets.token_hex(8)}")
    credits = get_credits(conn, user_id)
    snipes = get_snipes(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "plan": active_plan, "credits": credits, "snipes": snipes, "guthabenCents": guthaben_cents})


@app.route("/api/plans/checkout/confirm", methods=["POST"])
@login_required
def api_plans_checkout_confirm():
    """Wird vom Frontend aufgerufen, wenn der Nutzer von Stripe zur success_url
    zurückkehrt. Fragt den tatsächlichen Zahlungsstatus direkt bei Stripe ab
    (server-seitig, nicht vertrauenswürdig ist nur der Redirect selbst) und
    schaltet den Plan erst nach bestätigter Zahlung frei. Ergänzt den Webhook
    unten — beide Wege sind über stripe_session_id idempotent."""
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    stripe_session_id = data.get("sessionId")
    if not stripe_session_id:
        return jsonify({"error": "session_id fehlt."}), 400
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "Zahlungsanbieter ist noch nicht konfiguriert."}), 503

    try:
        checkout_session = stripe.checkout.Session.retrieve(stripe_session_id)
    except Exception:
        return jsonify({"error": "Checkout-Session nicht gefunden."}), 404

    if checkout_session.client_reference_id != user_id:
        return jsonify({"error": "Ungültige Session."}), 403
    if checkout_session.payment_status != "paid":
        return jsonify({"ok": False, "pending": True})

    offer = getattr(checkout_session.metadata, "offer", None) if checkout_session.metadata else None
    conn = get_db()
    active_plan = grant_plan(conn, user_id, offer, stripe_session_id)
    credits = get_credits(conn, user_id)
    snipes = get_snipes(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "plan": active_plan, "credits": credits, "snipes": snipes, "guthabenCents": guthaben_cents})


@app.route("/webhook/stripe", methods=["POST"])
@limiter.exempt  # Server-zu-Server von Stripe, nicht durch das IP-Grundlimit deckeln
def stripe_webhook():
    """Server-zu-Server-Bestätigung von Stripe (unabhängig davon, ob der Nutzer
    je zur success_url zurückkehrt — z.B. wenn er den Tab vorher schließt).
    Erfordert STRIPE_WEBHOOK_SECRET; ohne gültige Signatur wird nichts
    verarbeitet."""
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature", "")
    if not STRIPE_WEBHOOK_SECRET:
        return "", 200
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        return "", 400

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        user_id = session_obj.client_reference_id
        offer = getattr(session_obj.metadata, "offer", None) if session_obj.metadata else None
        if user_id and offer and session_obj.payment_status == "paid":
            conn = get_db()
            grant_plan(conn, user_id, offer, session_obj["id"])
            conn.close()

    return "", 200


@app.route("/api/matches")
@optional_login
def api_matches():
    user_id = session.get("user_id")
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM scrim_rounds WHERE status = 'open' ORDER BY starts_at ASC"
    ).fetchall()
    matches = []
    for row in rows:
        player_count = conn.execute(
            "SELECT COUNT(*) AS c FROM scrim_participants WHERE round_id = ?", (row["id"],)
        ).fetchone()["c"]
        participant = conn.execute(
            "SELECT status FROM scrim_participants WHERE round_id = ? AND user_id = ?",
            (row["id"], user_id),
        ).fetchone()
        matches.append({
            "id": row["id"],
            "mode": row["mode"],
            "region": row["region"],
            "startsAt": row["starts_at"],
            "createdAt": row["created_at"],
            "maxPlayers": row["max_players"],
            "playerCount": player_count,
            "entryFee": row["entry_fee"],
            "teamSize": row["team_size"],
            "minPlayers": row["min_players"],
            "prizePool": PRIZE_POOL,
            "breakdown": PRIZE_BREAKDOWN,
            "joined": bool(participant),
            "myStatus": participant["status"] if participant else None,
        })
    conn.close()
    return jsonify({"matches": matches})


@app.route("/api/matches/<int:round_id>")
@optional_login
def api_match_detail_player(round_id):
    """Einzelne Runde für die Detailseite — anders als /api/matches (nur offene
    Runden) funktioniert das hier auch für bereits abgeschlossene/stornierte
    Runden, damit z.B. das Leaderboard nach Rundenende noch aufrufbar ist.
    Auch ohne Login abrufbar, damit Gäste sich Runden ansehen können."""
    user_id = session.get("user_id")
    conn = get_db()
    row = conn.execute("SELECT * FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden."}), 404

    player_count = conn.execute(
        "SELECT COUNT(*) AS c FROM scrim_participants WHERE round_id = ?", (round_id,)
    ).fetchone()["c"]
    participant = conn.execute(
        "SELECT status FROM scrim_participants WHERE round_id = ? AND user_id = ?",
        (round_id, user_id),
    ).fetchone()

    match = {
        "id": row["id"], "mode": row["mode"], "region": row["region"], "startsAt": row["starts_at"],
        "maxPlayers": row["max_players"], "minPlayers": row["min_players"], "playerCount": player_count,
        "entryFee": row["entry_fee"], "teamSize": row["team_size"], "status": row["status"],
        "prizePool": PRIZE_POOL, "breakdown": PRIZE_BREAKDOWN,
        "joined": bool(participant), "myStatus": participant["status"] if participant else None,
        # Der Match-Code wird bewusst nur an bestätigte Teilnehmer ausgeliefert,
        # nie an Gäste oder nur angefragte/wartende Spieler.
        "matchCode": row["match_code"] if participant and participant["status"] == "accepted" else None,
        "autoCompleteAt": (
            (parse_iso(row["finished_at"]) + ROUND_AUTO_COMPLETE_DELAY).strftime("%Y-%m-%d %H:%M:%S")
            if row["status"] == "open" and row["finished_at"] else None
        ),
    }

    entries = conn.execute(
        """
        SELECT scrim_participants.user_id, scrim_participants.team_id, scrim_participants.placement,
               scrim_participants.credits_won, users.username, teams.name AS team_name, teams.icon AS team_icon
        FROM scrim_participants
        JOIN users ON users.id = scrim_participants.user_id
        LEFT JOIN teams ON teams.id = scrim_participants.team_id
        WHERE scrim_participants.round_id = ? AND scrim_participants.status = 'accepted'
        ORDER BY teams.name ASC, users.username ASC
        """,
        (round_id,),
    ).fetchall()
    participants = [
        {
            "userId": e["user_id"], "username": e["username"], "teamId": e["team_id"],
            "teamName": e["team_name"], "teamIcon": e["team_icon"],
        }
        for e in entries
    ]

    leaderboard = []
    if row["status"] == "completed":
        placed = [e for e in entries if e["placement"]]
        placed.sort(key=lambda e: e["placement"])
        leaderboard = [
            {"placement": e["placement"], "username": e["username"], "creditsWon": e["credits_won"]}
            for e in placed
        ]

    conn.close()
    return jsonify({"match": match, "participants": participants, "leaderboard": leaderboard})


@app.route("/api/matches/<int:round_id>/join", methods=["POST"])
@login_required
def api_matches_join(round_id):
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    conn = get_db()
    round_row = conn.execute(
        "SELECT * FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden."}), 404

    team_size = round_row["team_size"]
    entry_fee = round_row["entry_fee"]

    already_joined = conn.execute(
        "SELECT 1 FROM scrim_participants WHERE round_id = ? AND user_id = ?",
        (round_id, user_id),
    ).fetchone()
    if already_joined:
        conn.close()
        return jsonify({"error": "Du bist bereits in dieser Runde."}), 400

    if team_size <= 1:
        player_count = conn.execute(
            "SELECT COUNT(*) AS c FROM scrim_participants WHERE round_id = ?", (round_id,)
        ).fetchone()["c"]
        if player_count >= round_row["max_players"]:
            conn.close()
            return jsonify({"error": "Runde ist bereits voll."}), 400

        credits = get_credits(conn, user_id)
        entry_paid = credits >= entry_fee
        if entry_paid:
            add_credits(conn, user_id, -entry_fee, "match_entry", str(round_id))

        conn.execute(
            "INSERT INTO scrim_participants (round_id, user_id, entry_paid, status) VALUES (?, ?, ?, 'accepted')",
            (round_id, user_id, 1 if entry_paid else 0),
        )
        conn.commit()
        credits = get_credits(conn, user_id)
        guthaben_cents = get_guthaben_cents(conn, user_id)
        conn.close()
        return jsonify({"ok": True, "entryPaid": entry_paid, "credits": credits, "guthabenCents": guthaben_cents})

    # Team-Runde (Duo/Trio): erfordert ein volles, einsatzbereites Team passender Größe.
    team_id = data.get("teamId")
    pay_for_teammates = bool(data.get("payForTeammates"))
    if not team_id:
        conn.close()
        return jsonify({"error": "Bitte ein Team auswählen."}), 400

    team_row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    if not team_row:
        conn.close()
        return jsonify({"error": "Team nicht gefunden."}), 404
    if team_row["owner_id"] != user_id:
        conn.close()
        return jsonify({"error": "Nur der Team-Owner kann das Team für eine Runde anmelden."}), 403
    if team_row["size"] != team_size:
        conn.close()
        return jsonify({"error": f"Für diese Runde wird ein Team mit {team_size} Spielern benötigt."}), 400

    members = conn.execute(
        "SELECT user_id FROM team_members WHERE team_id = ?", (team_id,)
    ).fetchall()
    member_ids = [m["user_id"] for m in members]
    if len(member_ids) != team_size:
        conn.close()
        return jsonify({"error": "Dein Team ist nicht voll und einsatzbereit."}), 400

    player_count = conn.execute(
        "SELECT COUNT(*) AS c FROM scrim_participants WHERE round_id = ?", (round_id,)
    ).fetchone()["c"]
    if player_count + team_size > round_row["max_players"]:
        conn.close()
        return jsonify({"error": "In der Runde ist nicht genug Platz für dein Team."}), 400

    existing = conn.execute(
        f"SELECT user_id FROM scrim_participants WHERE round_id = ? AND user_id IN ({','.join('?' * len(member_ids))})",
        (round_id, *member_ids),
    ).fetchall()
    if existing:
        conn.close()
        return jsonify({"error": "Ein Team-Mitglied ist bereits in dieser Runde."}), 400

    if pay_for_teammates:
        total_cost = entry_fee * team_size
        credits = get_credits(conn, user_id)
        if credits < total_cost:
            conn.close()
            return jsonify({"error": f"Nicht genug Credits, um für das ganze Team ({total_cost} Credits) zu bezahlen."}), 400
        add_credits(conn, user_id, -total_cost, "match_entry_team", str(round_id))
        for member_id in member_ids:
            status = "accepted" if member_id == user_id else "pending"
            conn.execute(
                "INSERT INTO scrim_participants (round_id, user_id, entry_paid, team_id, status) VALUES (?, ?, 1, ?, ?)",
                (round_id, member_id, team_id, status),
            )
    else:
        owner_credits = get_credits(conn, user_id)
        owner_entry_paid = owner_credits >= entry_fee
        if owner_entry_paid:
            add_credits(conn, user_id, -entry_fee, "match_entry", str(round_id))
        conn.execute(
            "INSERT INTO scrim_participants (round_id, user_id, entry_paid, team_id, status) VALUES (?, ?, ?, ?, 'accepted')",
            (round_id, user_id, 1 if owner_entry_paid else 0, team_id),
        )
        for member_id in member_ids:
            if member_id == user_id:
                continue
            conn.execute(
                "INSERT INTO scrim_participants (round_id, user_id, entry_paid, team_id, status) VALUES (?, ?, 0, ?, 'pending')",
                (round_id, member_id, team_id),
            )

    conn.commit()
    credits = get_credits(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "credits": credits, "guthabenCents": guthaben_cents})


@app.route("/api/matches/requests")
@login_required
def api_matches_requests():
    user_id = session["user_id"]
    conn = get_db()
    rows = conn.execute(
        """
        SELECT scrim_participants.*, scrim_rounds.mode AS mode, scrim_rounds.region AS region,
               scrim_rounds.starts_at AS starts_at, scrim_rounds.entry_fee AS entry_fee,
               teams.name AS team_name, teams.icon AS team_icon, users.username AS owner_username
        FROM scrim_participants
        JOIN scrim_rounds ON scrim_rounds.id = scrim_participants.round_id
        LEFT JOIN teams ON teams.id = scrim_participants.team_id
        LEFT JOIN users ON users.id = teams.owner_id
        WHERE scrim_participants.user_id = ? AND scrim_participants.status = 'pending'
        ORDER BY scrim_participants.joined_at ASC
        """,
        (user_id,),
    ).fetchall()
    conn.close()
    return jsonify({
        "requests": [
            {
                "roundId": r["round_id"],
                "mode": r["mode"],
                "region": r["region"],
                "startsAt": r["starts_at"],
                "entryFee": r["entry_fee"],
                "entryPaid": bool(r["entry_paid"]),
                "teamName": r["team_name"],
                "teamIcon": r["team_icon"],
                "invitedBy": r["owner_username"],
            }
            for r in rows
        ]
    })


@app.route("/api/matches/requests/<int:round_id>/accept", methods=["POST"])
@login_required
def api_matches_requests_accept(round_id):
    user_id = session["user_id"]
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'pending'",
        (round_id, user_id),
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Anfrage nicht gefunden."}), 404

    round_row = conn.execute("SELECT * FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row or round_row["status"] != "open":
        conn.execute("DELETE FROM scrim_participants WHERE round_id = ? AND user_id = ?", (round_id, user_id))
        conn.commit()
        conn.close()
        return jsonify({"error": "Runde ist nicht mehr offen."}), 400

    entry_paid = bool(row["entry_paid"])
    if not entry_paid:
        credits = get_credits(conn, user_id)
        entry_fee = round_row["entry_fee"]
        entry_paid = credits >= entry_fee
        if entry_paid:
            add_credits(conn, user_id, -entry_fee, "match_entry", str(round_id))

    conn.execute(
        "UPDATE scrim_participants SET status = 'accepted', entry_paid = ? WHERE round_id = ? AND user_id = ?",
        (1 if entry_paid else 0, round_id, user_id),
    )
    conn.commit()
    credits = get_credits(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "credits": credits, "guthabenCents": guthaben_cents})


@app.route("/api/matches/requests/<int:round_id>/decline", methods=["POST"])
@login_required
def api_matches_requests_decline(round_id):
    user_id = session["user_id"]
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'pending'",
        (round_id, user_id),
    ).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Anfrage nicht gefunden."}), 404

    # War die Teilnahme vom Team-Owner vorausbezahlt (Mitbezahlen-Option), bekommt
    # der Owner die Credits für diesen einen Platz zurück, nicht das ablehnende Mitglied.
    if row["entry_paid"] and row["team_id"]:
        team_row = conn.execute("SELECT owner_id FROM teams WHERE id = ?", (row["team_id"],)).fetchone()
        round_row = conn.execute("SELECT entry_fee FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
        if team_row and round_row:
            add_credits(conn, team_row["owner_id"], round_row["entry_fee"], "match_entry_refund", str(round_id))

    conn.execute("DELETE FROM scrim_participants WHERE round_id = ? AND user_id = ?", (round_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ==================== ScrimPass Companion Client ====================
# Der Companion-Client ist eine separate Windows-Anwendung (siehe /client),
# die vor Rundenstart aktiviert wird und Match-Ergebnisse automatisch aus
# Fortnites lokalem Log erkennt und meldet. Authentifizierung läuft NICHT
# über das Session-Cookie (Desktop-App, kein Browser), sondern über einen
# langlebigen Bearer-Token, den man einmalig per Pairing-Code verknüpft.

def client_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Kein gültiger Client-Token."}), 401
        token = auth[len("Bearer "):].strip()
        conn = get_db()
        row = conn.execute(
            "SELECT user_id FROM client_tokens WHERE token = ?", (token,)
        ).fetchone()
        if not row:
            conn.close()
            return jsonify({"error": "Kein gültiger Client-Token."}), 401
        user_row = conn.execute(
            "SELECT banned, ban_reason FROM users WHERE id = ?", (row["user_id"],)
        ).fetchone()
        if user_row and user_row["banned"]:
            conn.close()
            return jsonify({"error": "Dein Konto wurde gesperrt.", "banReason": user_row["ban_reason"]}), 403
        conn.execute(
            "UPDATE client_tokens SET last_used_at = ? WHERE token = ?", (now_iso(), token)
        )
        conn.commit()
        conn.close()
        request.client_user_id = row["user_id"]
        return view(*args, **kwargs)
    return wrapped


@app.route("/api/client/pair/exchange", methods=["POST"])
@limiter.limit("10 per minute")  # Schutz gegen Erraten des Pairing-Codes
def api_client_pair_exchange():
    """Von der Desktop-App aufgerufen (kein Login nötig — der Pairing-Code
    IST die Authentifizierung): tauscht den Code gegen einen dauerhaften
    Client-Token."""
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip().upper()
    label = (data.get("label") or "").strip()[:80] or None
    if not code:
        return jsonify({"error": "Code fehlt."}), 400

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM client_pair_codes WHERE code = ?", (code,)
    ).fetchone()
    if not row or row["used"] or parse_iso(row["expires_at"]) <= datetime.now(timezone.utc):
        conn.close()
        return jsonify({"error": "Code ungültig oder abgelaufen. Bitte neuen Code generieren."}), 400

    token = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO client_tokens (user_id, token, label) VALUES (?, ?, ?)",
        (row["user_id"], token, label),
    )
    conn.execute("UPDATE client_pair_codes SET used = 1 WHERE code = ?", (code,))
    conn.commit()
    username = get_or_create_username(conn, row["user_id"])
    conn.close()
    return jsonify({"token": token, "username": username})


@app.route("/api/client/tokens")
@login_required
def api_client_tokens():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, label, created_at, last_used_at FROM client_tokens WHERE user_id = ? ORDER BY created_at DESC",
        (session["user_id"],),
    ).fetchall()
    conn.close()
    return jsonify({"tokens": [
        {"id": r["id"], "label": r["label"] or "ScrimPass-Client", "createdAt": r["created_at"], "lastUsedAt": r["last_used_at"]}
        for r in rows
    ]})


@app.route("/api/client/tokens/<int:token_id>", methods=["DELETE"])
@login_required
def api_client_token_revoke(token_id):
    conn = get_db()
    conn.execute(
        "DELETE FROM client_tokens WHERE id = ? AND user_id = ?", (token_id, session["user_id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/client/me")
@client_required
def api_client_me():
    conn = get_db()
    username = get_or_create_username(conn, request.client_user_id)
    conn.close()
    return jsonify({"userId": request.client_user_id, "username": username})


# Zeitfenster für automatisch gemeldete Ergebnisse: ein Match darf schon kurz
# vor der offiziellen Startzeit beginnen (Lobby/Bus) und höchstens ein paar
# Stunden danach gemeldet werden. Verhindert, dass ein beliebiges anderes
# Match als Scrim-Ergebnis durchgeht. Das ist die eigentliche Sicherheits-
# grenze (gilt für JEDEN Aufruf von /report bzw. /replay, auch bei einem
# manipulierten Client) — muss zum client-seitigen MATCH_WINDOW_BEFORE in
# scrimpass_client.py passen.
CLIENT_MATCH_EARLIEST = timedelta(minutes=5)
CLIENT_REPORT_LATEST = timedelta(hours=3)
CLIENT_DOWNLOAD_CODE_TTL = timedelta(hours=12)

# Wer den Client bis zu dieser Zeit NACH dem offiziellen Rundenstart aktiviert,
# zählt noch als rechtzeitig -- reine Kulanz für Ladebildschirm-/Bus-Verzögerung,
# ändert nichts an der eigentlichen Sicherheitsgrenze oben (CLIENT_MATCH_EARLIEST/
# CLIENT_REPORT_LATEST gelten unverändert für das tatsächlich gespielte Match).
# Muss zum client-seitigen CLIENT_LATE_ACTIVATION_GRACE in scrimpass_client.py passen.
CLIENT_LATE_ACTIVATION_GRACE = timedelta(minutes=5)

# Runden schließen sich selbst ab, sobald jemand nachweislich Platz 1 erreicht
# hat (scrim_rounds.finished_at, siehe _mark_round_finished_if_winner_known)
# und seitdem diese Zeit vergangen ist -- ohne Admin-Bestätigung. Der Puffer
# lässt Zeit für Nachzügler-Meldungen (Replay-Upload, langsamerer Client)
# einlaufen, bevor Platzierungen/Credits final vergeben werden. Der Admin
# kann die Platzierungen danach trotzdem jederzeit von Hand korrigieren
# (siehe api_admin_match_results).
ROUND_AUTO_COMPLETE_DELAY = timedelta(minutes=15)


@app.route("/api/client/matches")
@client_required
def api_client_matches():
    """Runden, denen der Client-Nutzer als Spieler oder Team-Mitglied
    zugesagt hat und die noch nicht vorbei sind. Der Client aktiviert sich
    für diese Runden automatisch (siehe /activate) und verfolgt dann das
    Match."""
    user_id = request.client_user_id
    conn = get_db()
    rows = conn.execute(
        """
        SELECT scrim_rounds.*, scrim_participants.checked_in_at AS checked_in_at,
               scrim_participants.placement AS placement,
               scrim_participants.auto_reported AS auto_reported
        FROM scrim_participants
        JOIN scrim_rounds ON scrim_rounds.id = scrim_participants.round_id
        WHERE scrim_participants.user_id = ? AND scrim_participants.status = 'accepted'
          AND scrim_rounds.status = 'open'
        ORDER BY scrim_rounds.starts_at ASC
        """,
        (user_id,),
    ).fetchall()
    conn.close()
    return jsonify({"matches": [
        {
            "id": r["id"], "mode": r["mode"], "region": r["region"], "startsAt": r["starts_at"],
            "teamSize": r["team_size"], "checkedIn": bool(r["checked_in_at"]),
            "reported": bool(r["auto_reported"] and r["placement"]),
        }
        for r in rows
    ]})


@app.route("/api/client/matches/<int:round_id>/activate", methods=["POST"])
@client_required
def api_client_activate(round_id):
    """Der Client ruft das nach dem Start selbst für jede zugesagte Runde
    auf. Zählt bis CLIENT_LATE_ACTIVATION_GRACE nach der offiziellen Startzeit
    (Kulanz für Ladebildschirm-/Bus-Verzögerung) — wer noch später startet,
    wird für diese Runde nicht automatisch erfasst (der Admin kann das
    Ergebnis dann wie bisher von Hand eintragen)."""
    user_id = request.client_user_id
    conn = get_db()
    round_row = conn.execute(
        "SELECT * FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden oder nicht mehr offen."}), 404
    participant = conn.execute(
        "SELECT checked_in_at FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'accepted'",
        (round_id, user_id),
    ).fetchone()
    if not participant:
        conn.close()
        return jsonify({"error": "Du bist für diese Runde nicht angemeldet."}), 403
    if participant["checked_in_at"]:
        conn.close()
        return jsonify({"ok": True})
    if datetime.now(timezone.utc) >= parse_iso(round_row["starts_at"]) + CLIENT_LATE_ACTIVATION_GRACE:
        conn.close()
        return jsonify({"error": "Die Runde hat bereits begonnen — Aktivierung nur bis kurz nach Rundenstart möglich."}), 400
    conn.execute(
        "UPDATE scrim_participants SET checked_in_at = ? WHERE round_id = ? AND user_id = ?",
        (now_iso(), round_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/client/matches/<int:round_id>/report", methods=["POST"])
@client_required
def api_client_report(round_id):
    """Automatische Ergebnis-Meldung vom Companion-Client. Speichert nur die
    Platzierung — Credits gibt es erst, wenn der Admin die Runde abschließt
    und die gemeldeten Platzierungen prüft (der Client läuft auf dem Rechner
    des Spielers und kann grundsätzlich manipuliert werden, Credits sind
    auszahlbar)."""
    user_id = request.client_user_id
    data = request.get_json(silent=True) or {}
    placement = data.get("placement")
    if not isinstance(placement, int) or isinstance(placement, bool) or placement < 1:
        return jsonify({"error": "Ungültige Platzierung."}), 400

    conn = get_db()
    round_row = conn.execute(
        "SELECT * FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden oder bereits abgeschlossen."}), 404
    participant = conn.execute(
        "SELECT * FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'accepted'",
        (round_id, user_id),
    ).fetchone()
    if not participant:
        conn.close()
        return jsonify({"error": "Du bist für diese Runde nicht angemeldet."}), 403

    starts_at = parse_iso(round_row["starts_at"])
    if not participant["checked_in_at"] or parse_iso(participant["checked_in_at"]) > starts_at + CLIENT_LATE_ACTIVATION_GRACE:
        conn.close()
        return jsonify({"error": "Der Client war vor Rundenstart nicht aktiv."}), 400
    now = datetime.now(timezone.utc)
    if now < starts_at - CLIENT_MATCH_EARLIEST or now > starts_at + CLIENT_REPORT_LATEST:
        conn.close()
        return jsonify({"error": "Ergebnis außerhalb des Zeitfensters dieser Runde."}), 400
    if participant["auto_reported"] and participant["placement"]:
        conn.close()
        return jsonify({"error": "Für diese Runde wurde bereits ein Ergebnis gemeldet."}), 409

    conn.execute(
        "UPDATE scrim_participants SET placement = ?, auto_reported = 1 WHERE round_id = ? AND user_id = ?",
        (placement, round_id, user_id),
    )
    _mark_round_finished_if_winner_known(conn, round_id)
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "placement": placement})


EPIC_ID_RE = re.compile(r"^[0-9a-f]{32}$", re.IGNORECASE)


@app.route("/api/client/matches/<int:round_id>/replay", methods=["POST"])
@client_required
def api_client_upload_replay(round_id):
    """Nimmt eine hochgeladene Fortnite-Replay-Datei entgegen. Anders als
    /report (nur die eigene Platzierung) steckt in einer Replay-Datei die
    Eliminierungs-Reihenfolge der GANZEN Lobby — daraus lassen sich
    Platzierungen für alle per Epic-Account verknüpften Teilnehmer dieser
    Runde ableiten, auch für die, deren eigener Client nicht aktiv war.
    Wird im Hintergrund ausgewertet (process_replay_async), damit der Upload
    selbst nicht durch das oft mehrere zehn Sekunden dauernde Parsen
    blockiert."""
    user_id = request.client_user_id

    conn = get_db()
    round_row = conn.execute(
        "SELECT * FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden oder bereits abgeschlossen."}), 404
    participant = conn.execute(
        "SELECT * FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'accepted'",
        (round_id, user_id),
    ).fetchone()
    if not participant:
        conn.close()
        return jsonify({"error": "Du bist für diese Runde nicht angemeldet."}), 403

    starts_at = parse_iso(round_row["starts_at"])
    now = datetime.now(timezone.utc)
    if now < starts_at - CLIENT_MATCH_EARLIEST or now > starts_at + CLIENT_REPORT_LATEST:
        conn.close()
        return jsonify({"error": "Außerhalb des Zeitfensters dieser Runde."}), 400
    conn.close()

    replay_file = request.files.get("replay")
    if not replay_file or not replay_file.filename:
        return jsonify({"error": "Keine Replay-Datei übermittelt."}), 400

    round_dir = REPLAYS_DIR / str(round_id)
    round_dir.mkdir(parents=True, exist_ok=True)
    dest_path = round_dir / f"{secrets.token_hex(8)}.replay"
    replay_file.save(dest_path)

    threading.Thread(
        target=process_replay_async, args=(round_id, dest_path, user_id), daemon=True
    ).start()
    return jsonify({"ok": True})


@app.route("/api/matches/<int:round_id>/replay", methods=["POST"])
@login_required
def api_manual_upload_replay(round_id):
    """Fallback für Spieler, falls der SP-Client aus irgendeinem Grund nicht
    lief oder der automatische Upload fehlschlug: manuelles Hochladen der
    .replay-Datei über die Website. Läuft danach durch dieselbe Auswertung
    (apply_replay_placements) wie ein Client-Upload, bleibt aber — anders als
    dort — dauerhaft gespeichert und in manual_replay_uploads nachvollziehbar,
    damit ein Admin sich das Ergebnis im Admin-Bereich ansehen kann."""
    user_id = session["user_id"]

    conn = get_db()
    round_row = conn.execute(
        "SELECT * FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden oder bereits abgeschlossen."}), 404
    participant = conn.execute(
        "SELECT * FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'accepted'",
        (round_id, user_id),
    ).fetchone()
    if not participant:
        conn.close()
        return jsonify({"error": "Du bist für diese Runde nicht angemeldet."}), 403

    starts_at = parse_iso(round_row["starts_at"])
    now = datetime.now(timezone.utc)
    if now < starts_at - CLIENT_MATCH_EARLIEST or now > starts_at + CLIENT_REPORT_LATEST:
        conn.close()
        return jsonify({"error": "Außerhalb des Zeitfensters dieser Runde."}), 400

    replay_file = request.files.get("replay")
    if not replay_file or not replay_file.filename:
        conn.close()
        return jsonify({"error": "Keine Replay-Datei übermittelt."}), 400

    round_dir = MANUAL_REPLAYS_DIR / str(round_id)
    round_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{secrets.token_hex(8)}.replay"
    dest_path = round_dir / stored_name
    replay_file.save(dest_path)
    # Relativ zu MANUAL_REPLAYS_DIR gespeichert (analog zu cheat_report_photos),
    # damit send_from_directory beim Download nicht außerhalb des Ordners lesen kann.
    relative_path = f"{round_id}/{stored_name}"

    original_filename = Path(replay_file.filename).name
    cur = conn.execute(
        "INSERT INTO manual_replay_uploads (round_id, user_id, original_filename, stored_path, status) "
        "VALUES (?, ?, ?, ?, 'pending')",
        (round_id, user_id, original_filename, relative_path),
    )
    manual_upload_id = cur.lastrowid
    conn.commit()
    conn.close()

    threading.Thread(
        target=process_replay_async,
        args=(round_id, dest_path, user_id),
        kwargs={"manual_upload_id": manual_upload_id},
        daemon=True,
    ).start()
    return jsonify({"ok": True})


@app.route("/api/matches/<int:round_id>/problem-report", methods=["POST"])
@login_required
def api_round_problem_report(round_id):
    """Kleine Zusatzoption neben dem manuellen Replay-Upload: ein Teilnehmer
    kann unabhängig von einem Datei-Upload kurz beschreiben, dass bei dieser
    Runde etwas nicht gestimmt hat (z.B. Platzierung wirkt falsch), damit der
    Admin es sich ansehen kann -- seit Runden sich jetzt automatisch
    abschließen, gibt es sonst keinen Moment mehr, an dem das zwangsläufig
    auffallen würde."""
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Bitte kurz beschreiben, was los war."}), 400
    if len(description) > 2000:
        return jsonify({"error": "Bitte kürzer fassen (max. 2000 Zeichen)."}), 400

    conn = get_db()
    participant = conn.execute(
        "SELECT 1 FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'accepted'",
        (round_id, user_id),
    ).fetchone()
    if not participant:
        conn.close()
        return jsonify({"error": "Du bist für diese Runde nicht angemeldet."}), 403

    conn.execute(
        "INSERT INTO round_problem_reports (round_id, user_id, description) VALUES (?, ?, ?)",
        (round_id, user_id, description),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


def _cleanup_replay(path):
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass


def _set_manual_upload_status(manual_upload_id, status, detail):
    if manual_upload_id is None:
        return
    conn = get_db()
    try:
        conn.execute(
            "UPDATE manual_replay_uploads SET status = ?, detail = ? WHERE id = ?",
            (status, detail, manual_upload_id),
        )
        conn.commit()
    finally:
        conn.close()


def process_replay_async(round_id, replay_path, uploader_user_id, manual_upload_id=None):
    """Läuft in einem eigenen Thread (nicht blockierend für den Upload-
    Request). Jeder Fehler hier bleibt folgenlos für den Rest der App — bei
    Problemen (kein Node installiert, Parser stürzt ab, unbekanntes Format)
    bleibt einfach alles beim bisherigen Stand (🖥️ Client-Meldung, 🧮
    Herleitung, manuelle Admin-Eingabe). manual_upload_id ist gesetzt, wenn
    diese Replay über den Web-Upload (nicht den SP-Client) kam — dann wird
    die Datei NICHT gelöscht (Admin-Review) und der Status/Detail-Text in
    manual_replay_uploads hinterlegt."""
    try:
        result = subprocess.run(
            [NODE_BIN, str(REPLAY_PARSER_SCRIPT), str(replay_path)],
            capture_output=True, text=True, timeout=180,
        )
    except (subprocess.TimeoutExpired, OSError) as e:
        app.logger.warning("Replay-Parser für Runde #%s nicht ausführbar: %s", round_id, e)
        if manual_upload_id is None:
            _cleanup_replay(replay_path)
        _set_manual_upload_status(manual_upload_id, "parse_failed", f"Replay-Parser nicht ausführbar: {e}")
        return
    if manual_upload_id is None:
        _cleanup_replay(replay_path)
    if result.returncode != 0:
        detail = (result.stderr or "").strip()[:500]
        app.logger.warning("Replay-Parsing für Runde #%s fehlgeschlagen: %s", round_id, detail)
        _set_manual_upload_status(manual_upload_id, "parse_failed", detail or "Replay konnte nicht ausgewertet werden.")
        return
    try:
        parsed = json.loads(result.stdout)
    except ValueError:
        app.logger.warning("Replay-Parser für Runde #%s lieferte kein gültiges JSON.", round_id)
        _set_manual_upload_status(manual_upload_id, "parse_failed", "Replay-Parser lieferte kein gültiges JSON.")
        return

    conn = get_db()
    try:
        status, detail = apply_replay_placements(conn, round_id, uploader_user_id, parsed)
    finally:
        conn.close()
    _set_manual_upload_status(manual_upload_id, status, detail)


def _other_participants_epic_ids(conn, round_id, uploader_user_id):
    """Menge der Epic-Account-IDs aller Teilnehmer dieser Runde, die NICHT
    zum Team/Account des Uploaders gehören (nur die per Epic verknüpften)."""
    round_row = conn.execute("SELECT team_size FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        return set()
    team_size = round_row["team_size"]
    participants = conn.execute(
        "SELECT user_id, team_id FROM scrim_participants WHERE round_id = ? AND status = 'accepted'",
        (round_id,),
    ).fetchall()
    epic_by_user = dict(
        conn.execute(
            "SELECT epic_connections.user_id, epic_connections.epic_account_id "
            "FROM epic_connections JOIN scrim_participants "
            "ON scrim_participants.user_id = epic_connections.user_id "
            "WHERE scrim_participants.round_id = ? AND scrim_participants.status = 'accepted'",
            (round_id,),
        ).fetchall()
    )
    uploader_group_key = next(
        (
            (p["team_id"] if team_size > 1 and p["team_id"] else p["user_id"])
            for p in participants if p["user_id"] == uploader_user_id
        ),
        uploader_user_id,
    )
    return {
        epic_id
        for p in participants
        if (p["team_id"] if team_size > 1 and p["team_id"] else p["user_id"]) != uploader_group_key
        for epic_id in [(epic_by_user.get(p["user_id"]) or "").lower()]
        if EPIC_ID_RE.match(epic_id)
    }


def apply_replay_placements(conn, round_id, uploader_user_id, parsed):
    """Rekonstruiert Platzierungen aus einer ausgewerteten Replay-Datei für
    alle Teilnehmer dieser Runde mit verknüpftem Epic-Account — nicht nur für
    den Uploader. Schreibt NICHT direkt in `placement` (das bleibt der
    Admin-Bestätigung beim Rundenabschluss vorbehalten), sondern in
    `replay_placement`, genau wie `auto_reported` für Client-Meldungen.

    Gibt (status, detail) zurück — detail ist ein kurzer, für Admins
    lesbarer Text (z.B. für die Detailansicht manuell hochgeladener
    Replays). status ist einer von:
    "applied", "round_not_open", "invalid_data", "no_match_found",
    "better_round_found", "nothing_written"."""
    round_row = conn.execute(
        "SELECT team_size FROM scrim_rounds WHERE id = ? AND status = 'open'", (round_id,)
    ).fetchone()
    if not round_row:
        return "round_not_open", "Runde nicht gefunden oder bereits abgeschlossen."
    team_size = round_row["team_size"]
    total_players = parsed.get("totalPlayers")
    own_placement = parsed.get("ownPlacement")
    eliminations = parsed.get("eliminations") or []
    if not isinstance(total_players, int) or total_players < 1 or not isinstance(own_placement, int):
        return "invalid_data", "Replay-Datei enthielt keine auswertbaren Platzierungsdaten."

    # Rang JEDER im Replay eliminierten Entität (auch fremde Spieler/Bots
    # außerhalb unseres Rosters) — nur so bleibt die zeitliche Reihenfolge
    # korrekt, selbst wenn wir später nur einen Teil davon zuordnen können.
    last_elim_time = {}
    for e in eliminations:
        eid = e.get("eliminated")
        t = e.get("timeMs")
        if not eid or not isinstance(t, (int, float)):
            continue
        if eid not in last_elim_time or t > last_elim_time[eid]:
            last_elim_time[eid] = t
    ordered = sorted(last_elim_time.items(), key=lambda kv: kv[1])  # früheste Eliminierung zuerst
    placement_by_identifier = {}
    for k, (eid, _t) in enumerate(ordered):
        placement = total_players - k
        if 1 <= placement <= total_players:
            placement_by_identifier[eid] = placement

    # Alle Teilnehmer der Runde (nicht nur die mit verknüpftem Epic-Account) —
    # den Uploader kennen wir per Definition schon direkt über seinen eigenen
    # Upload, unabhängig davon, ob er selbst Epic verknüpft hat.
    all_participants = conn.execute(
        "SELECT user_id, team_id, placement FROM scrim_participants "
        "WHERE round_id = ? AND status = 'accepted'",
        (round_id,),
    ).fetchall()
    epic_by_user = dict(
        conn.execute(
            "SELECT epic_connections.user_id, epic_connections.epic_account_id "
            "FROM epic_connections JOIN scrim_participants "
            "ON scrim_participants.user_id = epic_connections.user_id "
            "WHERE scrim_participants.round_id = ? AND scrim_participants.status = 'accepted'",
            (round_id,),
        ).fetchall()
    )

    # Team-Gruppierung: bei Duo/Trio zählt fürs ganze Team entweder die
    # bekannte eigene Platzierung (falls der Uploader dabei ist) oder die
    # späteste bekannte Eliminierung unter den per Epic-Account verknüpften
    # Teammitgliedern — Team-Zugehörigkeit kommt aus unserer eigenen
    # Datenbank, nicht aus der Replay-Datei.
    groups = {}
    for p in all_participants:
        key = p["team_id"] if team_size > 1 and p["team_id"] else p["user_id"]
        groups.setdefault(key, []).append(p)

    # Sicherheits-Check: Der Client erkennt eine Runde nur über das
    # Zeitfenster, nicht darüber, ob wirklich die richtige Lobby (mit dem
    # ausgegebenen Match-Code) gespielt wurde — wer stattdessen ein
    # beliebiges anderes Match im selben Zeitfenster hochlädt, könnte sich
    # sonst eine falsche Platzierung erschleichen (auch die eigene). Zwei
    # Komplizen könnten sich sogar gegenseitig "bestätigen", indem sie
    # zusammen eine ANDERE Runde spielen, für die sie beide ebenfalls
    # angemeldet sind. Deshalb reicht ein einfacher "kommt mind. einer vor"-
    # Check nicht: Wir vergleichen die Übereinstimmung mit ALLEN offenen
    # Runden, für die der Uploader angemeldet ist, und akzeptieren die
    # angegebene Runde nur, wenn sie darunter die beste (oder gleichauf
    # beste) Übereinstimmung hat. Gibt es für die angegebene Runde gar
    # keine anderen per Epic verknüpften Teilnehmer, lässt sich nichts
    # vergleichen — dann bleibt es beim bisherigen Best-Effort.
    other_epic_ids = _other_participants_epic_ids(conn, round_id, uploader_user_id)
    if other_epic_ids:
        elim_ids = set(last_elim_time.keys())
        own_overlap = len(other_epic_ids & elim_ids)
        if own_overlap == 0:
            app.logger.warning(
                "Replay für Runde #%s: keiner der anderen bekannten Teilnehmer taucht darin auf "
                "(evtl. falsches Match hochgeladen) -- Platzierungen werden nicht übernommen.",
                round_id,
            )
            return "no_match_found", (
                "Keiner der anderen angemeldeten Teilnehmer dieser Runde taucht in dieser Replay auf — "
                "vermutlich nicht das richtige Match. Keine Platzierungen übernommen."
            )

        candidate_round_ids = [
            r["round_id"] for r in conn.execute(
                "SELECT scrim_participants.round_id FROM scrim_participants "
                "JOIN scrim_rounds ON scrim_rounds.id = scrim_participants.round_id "
                "WHERE scrim_participants.user_id = ? AND scrim_participants.status = 'accepted' "
                "AND scrim_rounds.status = 'open' AND scrim_participants.round_id != ?",
                (uploader_user_id, round_id),
            ).fetchall()
        ]
        for other_round_id in candidate_round_ids:
            other_overlap = len(_other_participants_epic_ids(conn, other_round_id, uploader_user_id) & elim_ids)
            if other_overlap > own_overlap:
                app.logger.warning(
                    "Replay für Runde #%s: Runde #%s passt besser (Übereinstimmung %s vs. %s) "
                    "-- Platzierungen werden nicht übernommen.",
                    round_id, other_round_id, other_overlap, own_overlap,
                )
                return "better_round_found", (
                    f"Runde #{other_round_id} passt besser zu dieser Replay als die angegebene Runde "
                    f"#{round_id} (Übereinstimmung {other_overlap} vs. {own_overlap}) — vermutlich falsche "
                    "Runde ausgewählt. Keine Platzierungen übernommen."
                )

    applied_count = 0
    for members in groups.values():
        member_user_ids = [m["user_id"] for m in members]
        if uploader_user_id in member_user_ids:
            placement = own_placement
        else:
            best_placement = None
            best_time = None
            for m in members:
                epic_id = (epic_by_user.get(m["user_id"]) or "").lower()
                if not EPIC_ID_RE.match(epic_id):
                    continue
                pl = placement_by_identifier.get(epic_id)
                t = last_elim_time.get(epic_id)
                if pl is None or t is None:
                    continue
                if best_time is None or t > best_time:
                    best_time = t
                    best_placement = pl
            if best_placement is None:
                continue
            placement = best_placement

        if not (1 <= placement <= total_players):
            continue
        for m in members:
            # AND replay_placement IS NULL: mehrere Teilnehmer laden
            # unabhängig voneinander Replays für dieselbe Runde hoch (das ist
            # gewollt, erhöht die Zuverlässigkeit) — aber eine bereits
            # gesetzte Platzierung wird dadurch nie nachträglich durch eine
            # andere (z.B. aus einem später versehentlich verarbeiteten,
            # falschen Replay) überschrieben. Wer sie korrigieren will, muss
            # es im Admin-Bereich von Hand tun.
            cur = conn.execute(
                "UPDATE scrim_participants SET replay_placement = ? "
                "WHERE round_id = ? AND user_id = ? AND placement IS NULL AND replay_placement IS NULL",
                (placement, round_id, m["user_id"]),
            )
            applied_count += cur.rowcount
    if applied_count:
        _mark_round_finished_if_winner_known(conn, round_id)
    conn.commit()

    if applied_count:
        return "applied", f"Platzierungen für {applied_count} Teilnehmer übernommen."
    return "nothing_written", (
        "Replay ausgewertet, aber keine neuen Platzierungen übernommen "
        "(waren evtl. schon vorher gesetzt)."
    )


@app.route("/api/client/info")
def api_client_info():
    return jsonify({"available": CLIENT_EXE_PATH.exists(), "latestVersion": CLIENT_LATEST_VERSION})


@app.route("/client/download")
def client_download():
    """Liefert die fertig gebaute Windows-.exe — aber personalisiert: im
    Dateinamen stecken ein einmaliger Verbindungs-Code für das eingeloggte
    Konto und die Adresse dieses Servers. Beim ersten Start liest der Client
    beides aus seinem eigenen Dateinamen und verbindet sich damit still im
    Hintergrund (kein Fenster, keine Code-Eingabe)."""
    user_id = session.get("user_id")
    if not user_id:
        return redirect("/login")
    if not CLIENT_EXE_PATH.exists():
        return (
            "Die Client-Datei ist noch nicht bereitgestellt (client/dist/ScrimPassClient.exe fehlt, "
            "siehe client/README.md).",
            404,
        )

    conn = get_db()
    row = conn.execute("SELECT banned FROM users WHERE id = ?", (user_id,)).fetchone()
    if row and row["banned"]:
        conn.close()
        return redirect("/gesperrt")
    conn.execute("DELETE FROM client_pair_codes WHERE expires_at <= ? OR used = 1", (now_iso(),))
    code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(16))
    expires_at = (datetime.now(timezone.utc) + CLIENT_DOWNLOAD_CODE_TTL).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "INSERT INTO client_pair_codes (code, user_id, expires_at) VALUES (?, ?, ?)",
        (code, user_id, expires_at),
    )
    conn.commit()
    conn.close()

    base_url = PUBLIC_BASE_URL or request.host_url.rstrip("/")
    host_b32 = base64.b32encode(base_url.encode()).decode().rstrip("=")
    return send_file(
        CLIENT_EXE_PATH,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=f"ScrimPassClient_{code}_{host_b32}.exe",
    )


@app.route("/api/shop")
@login_required
def api_shop():
    return jsonify({"items": [{"name": name, "cost": cost} for name, cost in SHOP_ITEMS.items()]})


@app.route("/api/shop/redeem", methods=["POST"])
@login_required
def api_shop_redeem():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    item = data.get("item")
    cost = SHOP_ITEMS.get(item)
    if cost is None:
        return jsonify({"error": "Unbekannter Artikel."}), 400

    conn = get_db()
    credits = get_credits(conn, user_id)
    if credits < cost:
        conn.close()
        return jsonify({"error": f"Nicht genug Credits für {item}."}), 400

    add_credits(conn, user_id, -cost, "shop_redeem", item)
    if item == "Snipe":
        add_snipes(conn, user_id, 1)
    conn.commit()
    credits = get_credits(conn, user_id)
    snipes = get_snipes(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "credits": credits, "snipes": snipes, "guthabenCents": guthaben_cents})


@app.route("/api/shop/convert", methods=["POST"])
@login_required
def api_shop_convert():
    """Wandelt Credits manuell 1:1 in Guthaben um — nur mit aktivem Plan möglich."""
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")
    if not isinstance(amount, int) or amount <= 0:
        return jsonify({"error": "Ungültiger Betrag."}), 400

    conn = get_db()
    plan = get_active_plan(conn, user_id)
    if not plan:
        conn.close()
        return jsonify({"error": "Erfordert einen aktiven Masterclass-Plan."}), 403

    credits = get_credits(conn, user_id)
    if amount > credits:
        conn.close()
        return jsonify({"error": "Nicht genug Credits."}), 400

    add_credits(conn, user_id, -amount, "manual_conversion", None)
    add_guthaben_cents(conn, user_id, amount * 100, "manual_conversion", None)
    conn.commit()
    credits = get_credits(conn, user_id)
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "credits": credits, "guthabenCents": guthaben_cents})


@app.route("/api/transactions")
@login_required
def api_transactions():
    user_id = session["user_id"]
    conn = get_db()
    credit_rows = conn.execute(
        "SELECT amount, reason, meta, created_at FROM credit_transactions "
        "WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
        (user_id,),
    ).fetchall()
    guthaben_rows = conn.execute(
        "SELECT amount_cents, reason, meta, created_at FROM guthaben_transactions "
        "WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
        (user_id,),
    ).fetchall()
    conn.close()
    transactions = [
        {"currency": "credits", "amount": r["amount"], "reason": r["reason"], "meta": r["meta"], "createdAt": r["created_at"]}
        for r in credit_rows
    ] + [
        {"currency": "eur", "amountCents": r["amount_cents"], "reason": r["reason"], "meta": r["meta"], "createdAt": r["created_at"]}
        for r in guthaben_rows
    ]
    transactions.sort(key=lambda t: t["createdAt"], reverse=True)
    return jsonify({"transactions": transactions})


@app.route("/api/payout/bank-details")
@login_required
def api_payout_bank_details_get():
    user_id = session["user_id"]
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM payout_bank_details WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({"bankDetails": None})
    return jsonify({
        "bankDetails": {
            "firstName": row["first_name"],
            "lastName": row["last_name"],
            "addressLine1": row["address_line1"],
            "addressLine2": row["address_line2"],
            "city": row["city"],
            "postalCode": row["postal_code"],
            "country": row["country"],
            "ibanLast4": decrypt_secret(row["iban_encrypted"])[-4:],
            "updatedAt": row["updated_at"],
        }
    })


@app.route("/api/payout/bank-details", methods=["POST"])
@login_required
def api_payout_bank_details_post():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    required = ["firstName", "lastName", "addressLine1", "city", "postalCode", "country", "iban", "bic"]
    for field in required:
        if not (data.get(field) or "").strip():
            return jsonify({"error": f"Feld '{field}' fehlt."}), 400

    conn = get_db()
    conn.execute(
        """
        INSERT INTO payout_bank_details
            (user_id, first_name, last_name, address_line1, address_line2, city, postal_code, country, iban_encrypted, bic_encrypted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            address_line1 = excluded.address_line1,
            address_line2 = excluded.address_line2,
            city = excluded.city,
            postal_code = excluded.postal_code,
            country = excluded.country,
            iban_encrypted = excluded.iban_encrypted,
            bic_encrypted = excluded.bic_encrypted,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            user_id,
            data["firstName"].strip(),
            data["lastName"].strip(),
            data["addressLine1"].strip(),
            (data.get("addressLine2") or "").strip() or None,
            data["city"].strip(),
            data["postalCode"].strip(),
            data["country"].strip(),
            encrypt_secret(data["iban"].strip()),
            encrypt_secret(data["bic"].strip()),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/payout/request", methods=["POST"])
@login_required
def api_payout_request():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    amount_cents = data.get("amountCents")
    if not isinstance(amount_cents, int) or amount_cents <= 0:
        return jsonify({"error": "Ungültiger Betrag."}), 400

    conn = get_db()
    bank_details = conn.execute(
        "SELECT 1 FROM payout_bank_details WHERE user_id = ?", (user_id,)
    ).fetchone()
    if not bank_details:
        conn.close()
        return jsonify({"error": "Bitte hinterlege zuerst deine Bankdaten."}), 400

    guthaben_cents = get_guthaben_cents(conn, user_id)
    if amount_cents > guthaben_cents:
        conn.close()
        return jsonify({"error": "Nicht genug Guthaben."}), 400

    add_guthaben_cents(conn, user_id, -amount_cents, "payout_request", None)
    conn.execute(
        "INSERT INTO payout_requests (user_id, amount_cents) VALUES (?, ?)",
        (user_id, amount_cents),
    )
    conn.commit()
    guthaben_cents = get_guthaben_cents(conn, user_id)
    conn.close()
    return jsonify({"ok": True, "guthabenCents": guthaben_cents})


@app.route("/api/payout/requests")
@login_required
def api_payout_requests_mine():
    user_id = session["user_id"]
    conn = get_db()
    rows = conn.execute(
        "SELECT id, amount_cents, status, created_at FROM payout_requests "
        "WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return jsonify({
        "requests": [
            {"id": r["id"], "amountCents": r["amount_cents"], "status": r["status"], "createdAt": r["created_at"]}
            for r in rows
        ]
    })


# ---------------------------------------------------------------------------
# Admin (Match-Rounds erstellen, Ergebnisse eintragen, Auszahlungen verwalten).
# Zugriff nur für User-IDs in ADMIN_USER_IDS (.env). Ergebnis-Erfassung ist hier
# manuell gehalten, bis eine Yunite/Warlegend-Anbindung das automatisiert.
# ---------------------------------------------------------------------------


TEAM_SIZE_MODE_LABELS = {1: "Solo Battle Royale", 2: "Duo Battle Royale", 3: "Trio Battle Royale"}


@app.route("/api/admin/matches", methods=["POST"])
@admin_required
def api_admin_matches_create():
    data = request.get_json(silent=True) or {}
    starts_at = data.get("startsAt")
    if not starts_at:
        return jsonify({"error": "startsAt fehlt."}), 400
    team_size = int(data.get("teamSize") or 1)
    if team_size not in (1, 2, 3):
        return jsonify({"error": "Ungültige Team-Größe."}), 400
    mode = (data.get("mode") or "").strip() or TEAM_SIZE_MODE_LABELS[team_size]
    region = (data.get("region") or "EU").strip()
    max_players = int(data.get("maxPlayers") or 100)
    min_players = int(data.get("minPlayers") or 65)
    entry_fee = int(data.get("entryFee") or 2)

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO scrim_rounds (mode, region, starts_at, max_players, min_players, entry_fee, team_size) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mode, region, starts_at, max_players, min_players, entry_fee, team_size),
    )
    conn.commit()
    round_id = cur.lastrowid
    conn.close()
    return jsonify({"ok": True, "id": round_id})


@app.route("/api/admin/matches/<int:round_id>/postpone", methods=["POST"])
@admin_required
def api_admin_matches_postpone(round_id):
    data = request.get_json(silent=True) or {}
    starts_at = data.get("startsAt")
    if not starts_at:
        return jsonify({"error": "startsAt fehlt."}), 400

    conn = get_db()
    round_row = conn.execute("SELECT * FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden."}), 404
    if round_row["status"] != "open":
        conn.close()
        return jsonify({"error": "Nur offene Runden können verschoben werden."}), 400

    conn.execute("UPDATE scrim_rounds SET starts_at = ? WHERE id = ?", (starts_at, round_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/admin/matches/<int:round_id>/code", methods=["POST"])
@admin_required
def api_admin_matches_set_code(round_id):
    """Der Admin hostet das Custom-Match selbst in Fortnite (eigener Creator
    Code) und trägt den resultierenden Matchmaking-Code hier ein. Angezeigt
    wird er nur angemeldeten Teilnehmern dieser Runde (s. api_match_detail_player),
    damit er nicht öffentlich sichtbar ist."""
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    conn = get_db()
    round_row = conn.execute("SELECT id FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden."}), 404
    conn.execute("UPDATE scrim_rounds SET match_code = ? WHERE id = ?", (code or None, round_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/admin/matches")
@admin_required
def api_admin_matches_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM scrim_rounds ORDER BY created_at DESC LIMIT 50").fetchall()
    conn.close()
    return jsonify({
        "matches": [
            {
                "id": r["id"], "mode": r["mode"], "region": r["region"], "startsAt": r["starts_at"],
                "maxPlayers": r["max_players"], "minPlayers": r["min_players"], "entryFee": r["entry_fee"],
                "teamSize": r["team_size"], "status": r["status"], "createdAt": r["created_at"],
                "completedAt": r["completed_at"], "cancelledAt": r["cancelled_at"], "matchCode": r["match_code"],
                "autoCompleteAt": (
                    (parse_iso(r["finished_at"]) + ROUND_AUTO_COMPLETE_DELAY).strftime("%Y-%m-%d %H:%M:%S")
                    if r["status"] == "open" and r["finished_at"] else None
                ),
            }
            for r in rows
        ]
    })


@app.route("/api/admin/matches/<int:round_id>")
@admin_required
def api_admin_match_detail(round_id):
    conn = get_db()
    round_row = conn.execute("SELECT * FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden."}), 404
    participants, resolve_placement = resolve_round_placements(conn, round_row)
    conn.close()

    auto_complete_at = None
    if round_row["status"] == "open" and round_row["finished_at"]:
        auto_complete_at = (parse_iso(round_row["finished_at"]) + ROUND_AUTO_COMPLETE_DELAY).strftime("%Y-%m-%d %H:%M:%S")

    participants_out = []
    for p in participants:
        placement, source = resolve_placement(p)
        participants_out.append({
            "userId": p["user_id"], "username": p["username"], "entryPaid": bool(p["entry_paid"]),
            "placement": placement, "placementSource": source,
            "creditsWon": p["credits_won"],
            "status": p["status"], "teamId": p["team_id"], "teamName": p["team_name"],
            "banned": bool(p["banned"]), "checkedIn": bool(p["checked_in_at"]),
        })

    return jsonify({
        "match": {
            "id": round_row["id"], "mode": round_row["mode"], "status": round_row["status"],
            "startsAt": round_row["starts_at"], "teamSize": round_row["team_size"],
            "minPlayers": round_row["min_players"], "maxPlayers": round_row["max_players"],
            "matchCode": round_row["match_code"], "autoCompleteAt": auto_complete_at,
        },
        "participants": participants_out,
    })


@app.route("/api/admin/matches/<int:round_id>/results", methods=["POST"])
@admin_required
def api_admin_match_results(round_id):
    """Speichert Platzierungen für eine Runde -- funktioniert sowohl beim
    (mittlerweile optionalen) manuellen Erstabschluss als auch für spätere
    Korrekturen an einer bereits (automatisch oder manuell) abgeschlossenen
    Runde. Credits werden als Differenz zum bisherigen credits_won verbucht
    (nicht einfach addiert), damit ein wiederholter Aufruf mit denselben oder
    korrigierten Platzierungen niemals doppelt auszahlt."""
    data = request.get_json(silent=True) or {}
    placements = data.get("placements") or []

    conn = get_db()
    round_row = conn.execute("SELECT * FROM scrim_rounds WHERE id = ?", (round_id,)).fetchone()
    if not round_row:
        conn.close()
        return jsonify({"error": "Runde nicht gefunden."}), 404
    if round_row["status"] == "cancelled":
        conn.close()
        return jsonify({"error": "Runde wurde storniert — Teilnahmegebühren wurden bereits erstattet."}), 400

    for entry in placements:
        user_id = entry.get("userId")
        placement = entry.get("placement")
        member = conn.execute(
            "SELECT credits_won FROM scrim_participants WHERE round_id = ? AND user_id = ? AND status = 'accepted'",
            (round_id, user_id),
        ).fetchone()
        if not member:
            continue
        credits_won = PRIZE_BREAKDOWN.get(placement, 0) if placement else 0
        delta = credits_won - (member["credits_won"] or 0)
        conn.execute(
            "UPDATE scrim_participants SET placement = ?, credits_won = ? WHERE round_id = ? AND user_id = ?",
            (placement, credits_won, round_id, user_id),
        )
        if delta != 0:
            add_credits(conn, user_id, delta, "match_reward", str(round_id))

    conn.execute(
        "UPDATE scrim_rounds SET status = 'completed', completed_at = COALESCE(completed_at, ?) WHERE id = ?",
        (now_iso(), round_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/admin/payout-requests")
@admin_required
def api_admin_payout_requests():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT payout_requests.*, users.username AS username,
               CASE WHEN payout_bank_details.user_id IS NULL THEN 0 ELSE 1 END AS has_bank_details
        FROM payout_requests
        JOIN users ON users.id = payout_requests.user_id
        LEFT JOIN payout_bank_details ON payout_bank_details.user_id = payout_requests.user_id
        ORDER BY payout_requests.created_at ASC
        """
    ).fetchall()
    conn.close()
    return jsonify({
        "requests": [
            {
                "id": r["id"], "userId": r["user_id"], "username": r["username"],
                "amountCents": r["amount_cents"], "status": r["status"], "createdAt": r["created_at"],
                "hasBankDetails": bool(r["has_bank_details"]),
                "paidBy": r["paid_by"], "paidAt": r["paid_at"],
            }
            for r in rows
        ]
    })


@app.route("/api/admin/payout-requests/<int:request_id>/bank-details")
@admin_required
def api_admin_payout_bank_details(request_id):
    """Entschlüsselte Bankdaten für EINE Auszahlungsanfrage — bewusst nicht Teil
    der normalen Listenansicht, sondern ein eigener Abruf, den man explizit
    auslöst. Jeder Abruf wird protokolliert (wer, wann, welche Anfrage), weil
    hier echte personenbezogene Zahlungsdaten offengelegt werden."""
    conn = get_db()
    request_row = conn.execute("SELECT user_id FROM payout_requests WHERE id = ?", (request_id,)).fetchone()
    if not request_row:
        conn.close()
        return jsonify({"error": "Anfrage nicht gefunden."}), 404
    bank_row = conn.execute(
        "SELECT * FROM payout_bank_details WHERE user_id = ?", (request_row["user_id"],)
    ).fetchone()
    if not bank_row:
        conn.close()
        return jsonify({"error": "Keine Bankdaten hinterlegt."}), 404

    conn.execute(
        "INSERT INTO payout_bank_detail_views (payout_request_id, admin_user_id) VALUES (?, ?)",
        (request_id, session["user_id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({
        "bankDetails": {
            "firstName": bank_row["first_name"],
            "lastName": bank_row["last_name"],
            "addressLine1": bank_row["address_line1"],
            "addressLine2": bank_row["address_line2"],
            "city": bank_row["city"],
            "postalCode": bank_row["postal_code"],
            "country": bank_row["country"],
            "iban": decrypt_secret(bank_row["iban_encrypted"]),
            "bic": decrypt_secret(bank_row["bic_encrypted"]),
        },
        "reference": f"ScrimPass Auszahlung #{request_id}",
    })


@app.route("/api/admin/payout-requests/<int:request_id>", methods=["POST"])
@admin_required
def api_admin_payout_requests_update(request_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("approved", "rejected", "paid"):
        return jsonify({"error": "Ungültiger Status."}), 400

    conn = get_db()
    row = conn.execute("SELECT * FROM payout_requests WHERE id = ?", (request_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Anfrage nicht gefunden."}), 404

    # "Ausgezahlt" ist der Schritt, der bestätigt, dass die echte Überweisung
    # bereits gemacht wurde — deshalb erst nach "Genehmigt" möglich (kein
    # Direktsprung von "Ausstehend"), und wer es markiert hat wird festgehalten.
    if status == "paid" and row["status"] != "approved":
        conn.close()
        return jsonify({"error": "Erst genehmigen, bevor sie als ausgezahlt markiert werden kann."}), 400
    if status == "paid":
        conn.execute(
            "UPDATE payout_requests SET paid_by = ?, paid_at = ? WHERE id = ?",
            (session["user_id"], now_iso(), request_id),
        )
    if status == "rejected" and row["status"] != "rejected":
        add_guthaben_cents(conn, row["user_id"], row["amount_cents"], "payout_rejected", str(request_id))

    conn.execute("UPDATE payout_requests SET status = ? WHERE id = ?", (status, request_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/reports", methods=["POST"])
@limiter.limit("5 per hour")  # Spam-Schutz für Cheat-Meldungen
@login_required
def api_reports_create():
    user_id = session["user_id"]
    reported_name = (request.form.get("reportedName") or "").strip()
    description = (request.form.get("description") or "").strip()
    clip_link = (request.form.get("clipLink") or "").strip()
    if not reported_name:
        return jsonify({"error": "Bitte gib den Fortnite-/Benutzernamen des gemeldeten Spielers an."}), 400
    if not description:
        return jsonify({"error": "Bitte beschreibe kurz, was vorgefallen ist."}), 400

    photos = request.files.getlist("photos")
    saved_paths = []
    for photo in photos[:5]:
        if not photo or not photo.filename:
            continue
        ext = photo.filename.rsplit(".", 1)[-1].lower() if "." in photo.filename else ""
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            continue
        safe_name = f"{secrets.token_hex(16)}.{ext}"
        photo.save(UPLOADS_DIR / safe_name)
        saved_paths.append(safe_name)

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO cheat_reports (reporter_user_id, reported_name, description, clip_link) VALUES (?, ?, ?, ?)",
        (user_id, reported_name, description, clip_link or None),
    )
    report_id = cur.lastrowid
    for path in saved_paths:
        conn.execute(
            "INSERT INTO cheat_report_photos (report_id, file_path) VALUES (?, ?)",
            (report_id, path),
        )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": report_id})


@app.route("/api/admin/reports")
@admin_required
def api_admin_reports_list():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT cheat_reports.*, users.username AS reporter_username
        FROM cheat_reports
        JOIN users ON users.id = cheat_reports.reporter_user_id
        ORDER BY cheat_reports.created_at DESC
        """
    ).fetchall()
    reports = []
    for r in rows:
        photos = conn.execute(
            "SELECT id, file_path FROM cheat_report_photos WHERE report_id = ?", (r["id"],)
        ).fetchall()
        reports.append({
            "id": r["id"],
            "reporterUsername": r["reporter_username"],
            "reportedName": r["reported_name"],
            "description": r["description"],
            "clipLink": r["clip_link"],
            "status": r["status"],
            "createdAt": r["created_at"],
            "photos": [{"id": p["id"], "url": f"/api/admin/reports/photo/{p['id']}"} for p in photos],
        })
    conn.close()
    return jsonify({"reports": reports})


@app.route("/api/admin/reports/photo/<int:photo_id>")
@admin_required
def api_admin_report_photo(photo_id):
    conn = get_db()
    row = conn.execute("SELECT file_path FROM cheat_report_photos WHERE id = ?", (photo_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Foto nicht gefunden."}), 404
    return send_from_directory(UPLOADS_DIR, row["file_path"])


@app.route("/api/admin/reports/<int:report_id>", methods=["POST"])
@admin_required
def api_admin_reports_update(report_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("open", "reviewed", "dismissed"):
        return jsonify({"error": "Ungültiger Status."}), 400
    conn = get_db()
    conn.execute("UPDATE cheat_reports SET status = ? WHERE id = ?", (status, report_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


REPLAY_STATUS_LABEL = {
    "pending": "Wird ausgewertet …",
    "applied": "Übernommen",
    "nothing_written": "Ausgewertet, nichts Neues übernommen",
    "no_match_found": "Passt zu keiner Runde",
    "better_round_found": "Falsche Runde vermutet",
    "invalid_data": "Keine auswertbaren Daten",
    "round_not_open": "Runde nicht mehr offen",
    "parse_failed": "Konnte nicht gelesen werden",
}


@app.route("/api/admin/replay-uploads")
@admin_required
def api_admin_replay_uploads_list():
    """Manuelle Web-Uploads (Fallback-Feature, siehe api_manual_upload_replay) —
    Übersicht für den Admin-Bereich."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT manual_replay_uploads.*, users.username, scrim_rounds.mode, scrim_rounds.starts_at
        FROM manual_replay_uploads
        JOIN users ON users.id = manual_replay_uploads.user_id
        JOIN scrim_rounds ON scrim_rounds.id = manual_replay_uploads.round_id
        ORDER BY manual_replay_uploads.uploaded_at DESC
        """
    ).fetchall()
    conn.close()
    uploads = [
        {
            "id": r["id"],
            "roundId": r["round_id"],
            "roundMode": r["mode"],
            "roundStartsAt": r["starts_at"],
            "username": r["username"],
            "originalFilename": r["original_filename"],
            "uploadedAt": r["uploaded_at"],
            "status": r["status"],
            "statusLabel": REPLAY_STATUS_LABEL.get(r["status"], r["status"]),
        }
        for r in rows
    ]
    return jsonify({"uploads": uploads})


@app.route("/api/admin/replay-uploads/<int:upload_id>")
@admin_required
def api_admin_replay_upload_detail(upload_id):
    conn = get_db()
    r = conn.execute(
        """
        SELECT manual_replay_uploads.*, users.username, scrim_rounds.mode, scrim_rounds.starts_at
        FROM manual_replay_uploads
        JOIN users ON users.id = manual_replay_uploads.user_id
        JOIN scrim_rounds ON scrim_rounds.id = manual_replay_uploads.round_id
        WHERE manual_replay_uploads.id = ?
        """,
        (upload_id,),
    ).fetchone()
    conn.close()
    if not r:
        return jsonify({"error": "Upload nicht gefunden."}), 404
    return jsonify({
        "id": r["id"],
        "roundId": r["round_id"],
        "roundMode": r["mode"],
        "roundStartsAt": r["starts_at"],
        "username": r["username"],
        "originalFilename": r["original_filename"],
        "uploadedAt": r["uploaded_at"],
        "status": r["status"],
        "statusLabel": REPLAY_STATUS_LABEL.get(r["status"], r["status"]),
        "detail": r["detail"],
        "downloadUrl": f"/api/admin/replay-uploads/{r['id']}/download",
    })


@app.route("/api/admin/replay-uploads/<int:upload_id>/download")
@admin_required
def api_admin_replay_upload_download(upload_id):
    conn = get_db()
    row = conn.execute(
        "SELECT stored_path, original_filename FROM manual_replay_uploads WHERE id = ?", (upload_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Upload nicht gefunden."}), 404
    return send_from_directory(
        MANUAL_REPLAYS_DIR, row["stored_path"], as_attachment=True,
        download_name=row["original_filename"] or "replay.replay",
    )


@app.route("/api/admin/problem-reports")
@admin_required
def api_admin_problem_reports_list():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT round_problem_reports.*, users.username, scrim_rounds.mode, scrim_rounds.starts_at
        FROM round_problem_reports
        JOIN users ON users.id = round_problem_reports.user_id
        JOIN scrim_rounds ON scrim_rounds.id = round_problem_reports.round_id
        ORDER BY round_problem_reports.created_at DESC
        """
    ).fetchall()
    conn.close()
    return jsonify({
        "reports": [
            {
                "id": r["id"], "roundId": r["round_id"], "roundMode": r["mode"], "roundStartsAt": r["starts_at"],
                "username": r["username"], "description": r["description"], "status": r["status"],
                "createdAt": r["created_at"],
            }
            for r in rows
        ]
    })


@app.route("/api/admin/problem-reports/<int:report_id>", methods=["POST"])
@admin_required
def api_admin_problem_reports_update(report_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("open", "resolved"):
        return jsonify({"error": "Ungültiger Status."}), 400
    conn = get_db()
    conn.execute("UPDATE round_problem_reports SET status = ? WHERE id = ?", (status, report_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/admin/users/<user_id>/ban", methods=["POST"])
@admin_required
def api_admin_ban_user(user_id):
    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip() or None
    round_id = data.get("roundId")

    conn = get_db()
    user_row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user_row:
        conn.close()
        return jsonify({"error": "Nutzer nicht gefunden."}), 404

    conn.execute(
        "UPDATE users SET banned = 1, ban_reason = ?, banned_at = ? WHERE id = ?",
        (reason, now_iso(), user_id),
    )

    # War der gebannte Spieler in der angegebenen Runde platziert, rücken alle
    # dahinter Platzierten eine Position nach vorne (2. wird 1., 3. wird 2., ...)
    # und ihr Preisgeld wird entsprechend ihrer neuen Platzierung neu berechnet.
    if round_id:
        banned_participant = conn.execute(
            "SELECT * FROM scrim_participants WHERE round_id = ? AND user_id = ?",
            (round_id, user_id),
        ).fetchone()
        if banned_participant and banned_participant["placement"]:
            banned_placement = banned_participant["placement"]

            # Preisgeld beim gebannten Spieler zurückbuchen (nicht unter 0) und
            # aus der Platzierung nehmen (disqualifiziert, kein Platz mehr).
            if banned_participant["credits_won"]:
                current_credits = get_credits(conn, user_id)
                revoke_amount = min(banned_participant["credits_won"], current_credits)
                if revoke_amount > 0:
                    add_credits(conn, user_id, -revoke_amount, "cheat_ban_prize_revoked", str(round_id))
            conn.execute(
                "UPDATE scrim_participants SET credits_won = 0, placement = NULL WHERE round_id = ? AND user_id = ?",
                (round_id, user_id),
            )

            # Alle nachfolgenden Platzierungen um eins nach vorne rücken.
            behind = conn.execute(
                "SELECT * FROM scrim_participants WHERE round_id = ? AND placement > ? ORDER BY placement ASC",
                (round_id, banned_placement),
            ).fetchall()
            for participant in behind:
                new_placement = participant["placement"] - 1
                new_credits = PRIZE_BREAKDOWN.get(new_placement, 0)
                delta = new_credits - (participant["credits_won"] or 0)
                if delta != 0:
                    add_credits(conn, participant["user_id"], delta, "cheat_ban_prize_reassigned", str(round_id))
                conn.execute(
                    "UPDATE scrim_participants SET placement = ?, credits_won = ? WHERE round_id = ? AND user_id = ?",
                    (new_placement, new_credits, round_id, participant["user_id"]),
                )

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/admin/users/<user_id>/unban", methods=["POST"])
@admin_required
def api_admin_unban_user(user_id):
    conn = get_db()
    conn.execute(
        "UPDATE users SET banned = 0, ban_reason = NULL, banned_at = NULL WHERE id = ?",
        (user_id,),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
