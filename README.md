# ScrimPass

ScrimPass-Projekt mit einem echten Flask-Backend + SQLite-Datenbank.
Aktuell sind folgende Bereiche echt (nicht nur Frontend-Demo):

- **Login**: Anmeldung ausschließlich über "Login mit Discord" (echtes
  OAuth2). Ohne Anmeldung landet man auf `/login`.
- **Verbindungen**: Epic Games (Fortnite) zusätzlich über echtes OAuth2
  verknüpfbar (Profil -> Verbindungen).
- **Teams**: Anzeigename, Spielersuche, Teams erstellen, Spieler einladen,
  Einladungen annehmen/ablehnen, Team verlassen/auflösen (Profil -> Teams).

Der Rest der Seite (Credits, Matches, Twitch/X-Verbindungen usw.) ist
weiterhin die Frontend-Demo aus dem Prototyp.

## Setup

### 1. Abhängigkeiten installieren

```bash
pip3 install -r requirements.txt
```

### 2. Discord-App anlegen

1. Gehe zu https://discord.com/developers/applications und klicke auf
   **New Application**. Name ist egal (z.B. "ScrimPass Dev").
2. Öffne im Menü links **OAuth2 -> General**. Dort stehen **Client ID**
   und **Client Secret** (Secret ggf. über "Reset Secret" erzeugen).
3. Unter **OAuth2 -> General -> Redirects** trage genau diese URL ein
   und speichere:
   ```
   http://localhost:8000/auth/discord/callback
   ```

### 3. Epic-Games-App anlegen

Epic bietet (anders als Discord) keinen Login-Button "out of the box" —
man braucht ein "Product" mit einer "Epic Account Services"-Anwendung im
Epic Developer Portal. Das ist eigentlich für Spiele mit dem EOS-SDK
gedacht, aber Epic stellt zusätzlich eine reine Web-OAuth2-API bereit
("Auth Web APIs"), die genau wie bei Discord funktioniert — genau die
nutzt dieses Projekt.

1. Gehe zu https://dev.epicgames.com/portal und melde dich mit deinem
   Epic-Games-Account an (ggf. Entwicklerkonto bestätigen).
2. Lege ein neues **Product** an (Name ist egal).
3. Öffne im Product die **Epic Account Services** und erstelle darüber
   eine Anwendung. Dort findest du **Client ID** und **Client Secret**.
4. Trage bei den **OAuth Redirect URLs** genau diese URL ein und speichere:
   ```
   http://localhost:8000/auth/epic/callback
   ```

### 4. Umgebungsvariablen setzen

```bash
cp .env.example .env
```

Trage in `.env` die `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` aus Schritt 2
und `EPIC_CLIENT_ID`/`EPIC_CLIENT_SECRET` aus Schritt 3 ein. Für `SECRET_KEY`
reicht eine beliebige lange Zufalls-Zeichenkette, z.B. erzeugt mit:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Server starten

```bash
python3 app.py
```

Die Seite läuft dann unter http://localhost:8000 und leitet ohne Login
zunächst auf `/login`. Nach "Mit Discord anmelden" landet man im echten
Account (`users.id` = Discord-ID). Unter Profil -> Verbindungen kann man
zusätzlich Epic Games verknüpfen.

## Wie der Login funktioniert

- `/auth/discord/login` leitet zu Discord, `/auth/discord/callback` tauscht
  den Code serverseitig gegen ein Token (das Client-Secret verlässt nie den
  Server), holt das Discord-Profil und setzt eine feste Session (30 Tage,
  `users.id` = Discord-Snowflake-ID). Discord kann in Verbindungen nicht
  getrennt werden, da es die Anmeldemethode ist.
- `/auth/epic/login` funktioniert genauso, ist aber optional und über
  Profil -> Verbindungen trennbar.
- Alle `/api/...`-Endpunkte sind über `@login_required` geschützt (401 ohne
  gültige Session), `/` leitet ohne Login auf `/login` weiter.
- "Abmelden" ruft `/auth/logout` auf (löscht die Server-Session) und leitet
  zurück zu `/login`.

## Wie Teams funktionieren

- Unter Profil -> Mein Profil einen eindeutigen Anzeigenamen setzen
  (3-20 Zeichen, Buchstaben/Zahlen/_). Darüber werden Spieler gesucht.
- Unter Profil -> Teams -> "+ Neues Team": Namen und Teamgröße wählen,
  optional direkt Spieler über die Suche zum Einladen auswählen.
- Der ⚙️-Button auf einer Team-Karte öffnet die Team-Verwaltung: Roster
  ansehen, (als Owner) weitere Spieler einladen, Team verlassen bzw. als
  Owner auflösen.
- Eingehende Einladungen erscheinen unter Profil -> Teams -> Einladungen
  und können dort angenommen oder abgelehnt werden.
- Alles läuft über echte Endpunkte (`/api/profile`, `/api/players/search`,
  `/api/teams`, `/api/invites`) und ist in `scrimpass.db` gespeichert
  (Tabellen `teams`, `team_members`, `team_invites`).

## Deployment (Render)

Das Projekt ist production-ready vorbereitet: `gunicorn` in
`requirements.txt`, ein `Procfile` (`web: gunicorn app:app`), und
`app.py` liest `PORT` aus der Umgebung. So geht's live:

1. **Code auf GitHub bringen**: Repo auf github.com anlegen (leer, ohne
   README), dann lokal:
   ```bash
   git remote add origin <deine-repo-url>
   git branch -M main
   git push -u origin main
   ```
2. **Render-Account anlegen** unter https://render.com (z.B. mit GitHub
   anmelden).
3. **New -> Web Service** -> das GitHub-Repo auswählen. Render erkennt
   Python automatisch; falls nicht, manuell setzen:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
4. **Persistent Disk hinzufügen** (Render-Dashboard -> Service -> Disks):
   mind. 1 GB, Mount-Pfad `/opt/render/project/src` (oder den Projektordner) —
   **wichtig**, sonst wird `scrimpass.db` bei jedem Deploy/Neustart gelöscht,
   da der Dateisystem-Speicher ohne Disk nicht dauerhaft ist. Persistent
   Disks gibt es erst ab einem bezahlten Plan (kein Gratis-Tier).
5. **Umgebungsvariablen setzen** (Service -> Environment):
   `SECRET_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `DISCORD_REDIRECT_URI`, `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET`,
   `EPIC_REDIRECT_URI` (Werte aus deiner lokalen `.env`, aber mit der
   Render-URL statt `localhost:8000`, z.B.
   `https://scrimpass.onrender.com/auth/discord/callback`).
6. **Redirect-URIs aktualisieren**: Im Discord Developer Portal
   (OAuth2 -> Redirects) und im Epic Developer Portal (Client ->
   Umgeleitete URL) die neue Render-URL statt `localhost:8000` eintragen.
7. Deploy abwarten — Render gibt automatisch eine `https://...onrender.com`-
   Domain inkl. HTTPS. Eine eigene Domain lässt sich später unter Settings ->
   Custom Domain verknüpfen.

## Nächste Schritte (falls gewünscht)

- Weitere Verbindungen (Twitch, X) genauso an echte OAuth2-Flows anbinden
  (beide haben normale Web-OAuth2-Flows wie Discord).
- Von SQLite auf eine "richtige" Datenbank (z.B. Postgres) wechseln, falls
  das Projekt über einen einzelnen Server hinaus skalieren soll.
- Team-Mitglieder durch den Owner entfernen (aktuell nur Beitreten/Verlassen).
- Echtes Bezahl-/Credits-System (aktuell reine Frontend-Demo ohne echten
  Zahlungsanbieter).
