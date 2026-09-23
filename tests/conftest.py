"""
Test-Setup: jeder Test bekommt eine frische Kopie des Projekts in einem
Temp-Ordner (wie die manuellen Isolations-Tests in diesem Projekt bisher
schon liefen) mit einer leeren, frisch initialisierten Datenbank — nichts
davon fasst je scrimpass.db oder die echte .env an.
"""
import shutil
import sys
from pathlib import Path

import pytest

PROJECT_DIR = Path(__file__).resolve().parent.parent
IGNORE = shutil.ignore_patterns(
    ".git", "__pycache__", "*.pyc", "uploads", "tests", ".env",
    "scrimpass.db", "dist",
)


@pytest.fixture()
def app_module(tmp_path, monkeypatch):
    work_dir = tmp_path / "app_copy"
    shutil.copytree(PROJECT_DIR, work_dir, ignore=IGNORE)
    monkeypatch.chdir(work_dir)
    monkeypatch.syspath_prepend(str(work_dir))
    # Admin-Testkonto, damit @admin_required-Endpunkte testbar sind.
    monkeypatch.setenv("ADMIN_USER_IDS", "admin_test_user")

    sys.modules.pop("app", None)
    import app as appmod  # frisch importiert: BASE_DIR zeigt auf work_dir, init_db() läuft neu

    appmod.app.config["TESTING"] = True
    appmod.app.config["RATELIMIT_ENABLED"] = False  # außer im eigenen Rate-Limit-Test
    yield appmod
    sys.modules.pop("app", None)


@pytest.fixture()
def client(app_module):
    return app_module.app.test_client()


def login_as(client, user_id):
    """Setzt die Session wie nach echtem Login — ohne Discord/Google zu brauchen."""
    with client.session_transaction() as sess:
        sess["user_id"] = user_id
        sess["_permanent"] = True
