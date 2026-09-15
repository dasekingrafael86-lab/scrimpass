# ScrimPass

Lokales ScrimPass-Projekt mit einem echten Flask-Backend + SQLite-Datenbank.
Aktuell sind folgende Bereiche echt (nicht nur Frontend-Demo):

- **Verbindungen**: Discord und Epic Games (Fortnite) über echtes OAuth2
  (Profil -> Verbindungen).
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

Die Seite läuft dann unter http://localhost:8000. Unter Profil ->
Verbindungen kann man jetzt wirklich auf "Verbinden" bei Discord oder Epic
Games klicken, wird zum jeweiligen Anbieter weitergeleitet, und nach der
Bestätigung zeigt die Seite den echten verbundenen Account an (inkl.
"Trennen"-Button, der die Verbindung wieder aus der Datenbank löscht).

## Wie die Verbindung funktioniert

- Jeder Browser bekommt beim ersten Besuch eine anonyme Session-ID (Cookie)
  und automatisch einen zufälligen Anzeigenamen (z.B. "Spieler4821"), der
  in Profil -> Mein Profil geändert werden kann.
- Klick auf "Verbinden" -> `/auth/discord/login` bzw. `/auth/epic/login`
  leitet zum jeweiligen Anbieter weiter.
- Der Anbieter leitet nach Bestätigung zurück an `/auth/.../callback`, der
  Server tauscht den Code serverseitig gegen ein Token (die Client-Secrets
  verlassen nie den Server) und holt Username bzw. Epic-Anzeigenamen.
- Die Verknüpfung wird in `scrimpass.db` (SQLite, wird beim ersten Start
  automatisch angelegt) mit der Session-ID gespeichert.
- Die Seite fragt beim Laden `/api/connections` ab und zeigt den echten
  Zustand für beide Verbindungen an.

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

## Nächste Schritte (falls gewünscht)

- Weitere Verbindungen (Twitch, X) genauso an echte OAuth2-Flows anbinden
  (beide haben normale Web-OAuth2-Flows wie Discord).
- Echtes Login-System statt anonymer Session, falls Nutzer sich über mehrere
  Geräte hinweg einloggen können sollen (aktuell ist die Team-Suche nur
  innerhalb desselben Browsers/derselben Session persistent zugänglich).
- Von SQLite auf eine "richtige" Datenbank wechseln, falls das Projekt
  produktiv gehen soll.
- Team-Mitglieder durch den Owner entfernen (aktuell nur Beitreten/Verlassen).
