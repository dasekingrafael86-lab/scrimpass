# ScrimPass

ScrimPass-Projekt mit einem echten Flask-Backend + SQLite-Datenbank.
Aktuell sind folgende Bereiche echt (nicht nur Frontend-Demo):

- **Login**: Anmeldung über "Login mit Discord" oder "Login mit Google"
  (beides echtes OAuth2). Ohne Anmeldung kann man sich frei umschauen
  (Scrim-Runden, Regeln, Preise ansehen) — erst bei Aktionen, die eine
  Anmeldung brauchen (z. B. einer Runde beitreten), wird man zu `/login`
  geschickt.
- **Verbindungen**: Epic Games (Fortnite) zusätzlich über echtes OAuth2
  verknüpfbar (Profil -> Verbindungen).
- **Teams**: Anzeigename, Spielersuche, Teams erstellen, Spieler einladen,
  Einladungen annehmen/ablehnen, Team verlassen/auflösen (Profil -> Teams).
- **Masterclass-Pläne, Credits, Matches, Shop, Auszahlung**: komplette
  Spiel-Ökonomie über echte Endpunkte, siehe eigener Abschnitt unten.
  Der Kauf eines Masterclass-Plans läuft über **echtes Stripe Checkout**
  (siehe "Echte Zahlung mit Stripe" unten) — sobald `STRIPE_SECRET_KEY`
  gesetzt ist, wird beim Kauf wirklich abgebucht. Auszahlungen an Spieler
  sind weiterhin nur als Datenbank-Eintrag vorbereitet — hier fließt noch
  kein echtes Geld, bis das bewusst angebunden wird (siehe "Nächste
  Schritte").

Der Rest der Seite (Twitch/X-Verbindungen, Dropmaps-Bibliothek usw.) ist
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

### 3. Google-App anlegen

1. Gehe zu https://console.cloud.google.com/apis/credentials (ggf. vorher
   ein Projekt anlegen) und klicke auf **Anmeldedaten erstellen ->
   OAuth-Client-ID**.
2. Falls noch nicht geschehen, richte zuerst den **OAuth-Zustimmungsbildschirm**
   ein (App-Name, Support-E-Mail reichen für den Testmodus).
3. Wähle als Anwendungstyp **Web-Anwendung**. Trage unter **Autorisierte
   Redirect-URIs** genau diese URL ein und speichere:
   ```
   http://localhost:8000/auth/google/callback
   ```
4. Client ID und Client Secret findest du danach in der Übersicht der
   OAuth-Client-ID.

### 4. Epic-Games-App anlegen

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

### 5. Umgebungsvariablen setzen

```bash
cp .env.example .env
```

Trage in `.env` die `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` aus Schritt 2,
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` aus Schritt 3 und
`EPIC_CLIENT_ID`/`EPIC_CLIENT_SECRET` aus Schritt 4 ein. Für `SECRET_KEY`
reicht eine beliebige lange Zufalls-Zeichenkette, z.B. erzeugt mit:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 6. Server starten

```bash
python3 app.py
```

Die Seite läuft dann unter http://localhost:8000 und ist auch ohne Login
ansehbar (Scrim-Runden, Regeln, Preise). Über "Mit Discord anmelden" oder
"Mit Google anmelden" landet man im echten Account (`users.id` =
Discord-Snowflake-ID bzw. `google_<sub>`). Unter Profil -> Verbindungen kann
man zusätzlich Epic Games verknüpfen.

## Wie der Login funktioniert

- `/auth/discord/login` leitet zu Discord, `/auth/discord/callback` tauscht
  den Code serverseitig gegen ein Token (das Client-Secret verlässt nie den
  Server), holt das Discord-Profil und setzt eine feste Session (30 Tage,
  `users.id` = Discord-Snowflake-ID). Discord kann in Verbindungen nicht
  getrennt werden, wenn es die Anmeldemethode dieses Accounts ist.
- `/auth/google/login` funktioniert genauso über Google (`users.id` =
  `google_<sub>`, damit es nicht mit Discord-IDs kollidiert). Ein Account
  wird also entweder über Discord oder über Google angelegt — beide sind
  gleichwertige, unabhängige Anmeldewege.
- `/auth/epic/login` ist zusätzlich optional und über Profil -> Verbindungen
  trennbar.
- Alle `/api/...`-Endpunkte, die eine Anmeldung brauchen, sind über
  `@login_required` geschützt (401 ohne gültige Session). Ein paar
  lesende Endpunkte (aktuell: Scrim-Runden-Liste und -Detailansicht) nutzen
  stattdessen `@optional_login` und funktionieren auch für Gäste. `/`
  liefert die Seite immer aus — erst eine geschützte Aktion (z. B. einer
  Runde beitreten) schickt einen Gast zu `/login`.
- "Abmelden" ruft `/auth/logout` auf (löscht die Server-Session) und leitet
  zurück zu `/login`.

## Wie Teams funktionieren

- Unter Profil -> Mein Profil einen eindeutigen Anzeigenamen setzen
  (3-20 Zeichen, Buchstaben/Zahlen/_). Darüber werden Spieler gesucht.
- Unter Profil -> Teams -> "+ Neues Team": Namen und Teamgröße wählen,
  optional direkt Spieler über die Suche zum Einladen auswählen.
- Der ⚙️-Button auf einer Team-Karte öffnet die Team-Verwaltung: Roster
  ansehen, (als Owner) weitere Spieler einladen, Team verlassen bzw. als
  Owner auflösen. Als Owner kann man dort außerdem einzelne Mitglieder
  entfernen (`DELETE /api/teams/<id>/members/<userId>`, nur der Owner,
  nicht sich selbst — dafür Team verlassen/auflösen).
- Eingehende Einladungen erscheinen unter Profil -> Teams -> Einladungen
  und können dort angenommen oder abgelehnt werden.
- Alles läuft über echte Endpunkte (`/api/profile`, `/api/players/search`,
  `/api/teams`, `/api/invites`) und ist in `scrimpass.db` gespeichert
  (Tabellen `teams`, `team_members`, `team_invites`).
- **Duo/Trio-Match-Runden**: Admins können unter `/admin` Runden mit
  Team-Größe Duo (2) oder Trio (3) statt Solo erstellen. Um einer
  Team-Runde beizutreten, braucht der Team-**Owner** ein volles,
  einsatzbereites Team passender Größe (`team_members`-Anzahl ==
  `teams.size`) — auswählbar über den Button "Team-Runde beitreten" auf
  der Matches-Seite. Beim Beitreten optional die Checkbox "Für mein
  ganzes Team mitbezahlen" aktivieren, um die Teilnahmegebühr aller
  Mitglieder direkt vom eigenen Credits-Guthaben zu bezahlen.
  Team-Mitglieder (außer dem Owner) erhalten daraufhin eine
  Match-Anfrage unter Profil -> Teams -> Match-Anfragen, die sie
  annehmen (`/api/matches/requests/<roundId>/accept`) oder ablehnen
  (`/api/matches/requests/<roundId>/decline`) müssen, um teilzunehmen.
  Wurde die Teilnahme vom Owner vorausbezahlt und ein Mitglied lehnt ab,
  bekommt der Owner die Credits für diesen Platz zurückerstattet. Nur
  Mitglieder mit Status "accepted" können bei der Ergebniserfassung im
  Admin-Bereich eine Platzierung bekommen.

## Cheat-Meldungen und Sperrungen

- Auf der Free-Scrims-Seite gibt es oben rechts den Button "🚩 Cheater
  melden". Jeder eingeloggte Nutzer kann darüber einen Verdacht melden:
  Fortnite-/Benutzername der gemeldeten Person, eine Beschreibung
  (Pflicht), optional ein Clip-Link sowie bis zu 5 Screenshots
  (`/api/reports`, Tabellen `cheat_reports` und `cheat_report_photos`).
  Hochgeladene Fotos landen unter `uploads/reports/` auf dem lokalen
  Dateisystem — genau wie `scrimpass.db` **nicht** persistent auf
  Render-Free-Tier ohne Disk (siehe Deployment-Abschnitt).
- Admins sehen alle Meldungen unter `/admin` im Abschnitt
  "Cheat-Meldungen" (`/api/admin/reports`), inkl. Fotos (per Klick
  vergrößerbar) und Clip-Link, und können sie als "geprüft" markieren
  oder verwerfen.
- **Sperren**: Entweder direkt aus einer Meldung heraus (ScrimPass-
  Nutzer-ID eintragen + "Bannen") oder direkt in der
  Teilnehmerliste einer Runde neben dem jeweiligen Spieler
  (`/api/admin/users/<id>/ban`). Gesperrte Nutzer werden bei jedem
  weiteren Login/API-Aufruf blockiert (403) und landen auf `/gesperrt`
  mit Sperrgrund; `/api/admin/users/<id>/unban` hebt die Sperre wieder
  auf.
- **Preisgeld-Übertragung**: Wird ein Spieler direkt aus der
  Teilnehmerliste einer **bereits abgeschlossenen** Runde gebannt, in der
  er platziert war, wird sein Platz aberkannt (Platzierung leer,
  Preisgeld zurückgebucht) und **alle dahinter platzierten Spieler
  rücken eine Position nach — Platz 2 wird Platz 1, Platz 3 wird Platz
  2, und so weiter — mit dem Preisgeld ihrer jeweils neuen Platzierung**.
  Das passiert nur, wenn die Sperrung mit Runden-Kontext ausgelöst wird
  — beim Bannen direkt aus einer Meldung heraus (ohne Rundenbezug)
  greift diese Logik nicht automatisch.

## Wie die Spiel-Ökonomie funktioniert

**Zwei getrennte Währungen** — das ist der Kern des Modells:

- **Credits** 🪙 — die Spielwährung. Verdient durch Match-Platzierungen,
  ausgegeben für Match-Teilnahme und Shop-Items (Dropmap, Snipe, Early
  Access). Credits allein sind **nicht** auszahlbar.
- **Guthaben** 💶 — echtes Geld (1 Credit = 1 Euro), zeigt sich oben rechts
  neben Credits/Snipes. Nur aus Guthaben kann eine Auszahlung beantragt
  werden.
- Im **Shop** gibt es zusätzlich die Karte "In Guthaben umtauschen": manuell
  Credits 1:1 in Guthaben umwandeln (`/api/shop/convert`), **nur mit
  aktivem Masterclass-Plan möglich** — ohne Plan zeigt die Karte
  stattdessen einen Link zu den Angeboten.

**Geschäftsmodell** (so wie besprochen umgesetzt):

- **Masterclass-Pläne** (Schnell-/Kleines/Großes Angebot) sind ein
  einmaliger Kauf über **echtes Stripe Checkout** und schalten für eine
  begrenzte Zeit (2/7/10 Tage) Dropmap-/Snipe-Kontingent und vollen
  Shop-Zugriff frei, plus einen Credits-Bonus.
- **Kauft man einen Plan, während der vorherige noch läuft, wird alles
  Stackbare oben draufaddiert** statt überschrieben: Laufzeit (wer z.B. bei
  noch 3 Tagen Restlaufzeit einen weiteren 7-Tage-Plan kauft, hat danach 10
  Tage Zugriff), der Credits-Bonus und das Snipe-Kontingent. Nur Dropmaps
  sind kein Zähler, sondern eine reine Anzeige des aktuellen Plan-Tarifs.
- **Zwei Kredit-Arten** (`users.credits` vs. `users.free_credits`,
  `get_credits`/`get_free_credits`/`add_round_winnings` in `app.py`):
  - **Auszahlungsfähige Credits**: aus dem Plan-Kauf-Bonus oder aus
    Platzierungen in Runden, deren Teilnahmegebühr bezahlt wurde
    (`entry_paid = 1`). Im Shop gegen Guthaben **oder** gegen alles andere
    einlösbar. Jederzeit manuell 1:1 in Guthaben eintauschbar
    (`/api/shop/convert`) — dafür ist **kein aktiver Plan mehr nötig**.
  - **Gratis-Kredite**: aus Platzierungen in Free-Join-Runden (nicht genug
    auszahlungsfähige Credits zum Bezahlen der Teilnahmegebühr vorhanden).
    Im Shop nur gegen alles **außer** Guthaben einlösbar, nie gegen Guthaben
    eintauschbar. Beim Einlösen im Shop werden Gratis-Kredite zuerst
    verbraucht (auszahlungsfähige Credits bleiben so lange wie möglich
    erhalten).
  - Die Teilnahmegebühr einer Runde lässt sich **ausschließlich mit
    auszahlungsfähigen Credits** bezahlen — Gratis-Kredite zählen dafür
    nicht, selbst wenn genug davon vorhanden wären. Reichen die
    auszahlungsfähigen Credits nicht, wird die Runde automatisch als
    Free-Join gespielt (`entryPaid: false`), unabhängig vom
    Gratis-Kredit-Bestand.
  - Es gibt **keine automatische Rückstufung mehr**: weder wird beim
    Plan-Kauf etwas zurückgesetzt, noch beim Plan-Ablauf irgendetwas
    umgewandelt (der frühere `settle_expired_plan_if_needed`-Automatismus
    wurde ersatzlos entfernt). Auszahlungsfähigkeit hängt nur noch daran,
    *wie* ein Credit verdient wurde, nicht am aktuellen Plan-Status.
- **Matches**: Solo-, Duo- oder Trio-Battle-Royale-Runden (bis 100
  Spieler), Teilnahme kostet Credits pro Spieler (automatisch abgebucht,
  wer nicht genug hat spielt trotzdem gratis mit). Bei Duo/Trio siehe
  Abschnitt "Wie Teams funktionieren" oben. Preispool nach Platzierung
  (Top 10) verteilt.
- **Voraussetzung fürs Mitspielen**: ein verknüpfter Epic Games Account
  (Profil → Verbindungen). Ohne Epic-Verknüpfung lässt sich diese Person
  später weder per Client noch per Replay-Auswertung eindeutig zuordnen —
  deshalb blockt `/api/matches/<id>/join` und
  `/api/matches/requests/<id>/accept` das schon vor dem Beitritt
  (`has_epic_linked` in `app.py`), statt es erst beim Auswerten zu bemerken.
- **Beitritt zum echten Match**: Der Admin hostet das Custom-Match selbst
  in Fortnite (eigener Creator Code) und trägt den resultierenden
  Matchmaking-Code im Admin-Bereich bei der jeweiligen Runde ein (Button
  "Code setzen"). Der Code wird ausschließlich angemeldeten Teilnehmern
  dieser Runde auf der Match-Detailseite angezeigt (nicht Gästen oder nur
  angefragten/wartenden Spielern) — sie kopieren ihn dort heraus und
  tragen ihn kurz vor Rundenstart in Fortnites Custom-Matchmaking-Menü
  ("Nach Code suchen") ein.
- **Ergebnis-Erfassung**: vier sich ergänzende automatische Quellen. Sobald
  für eine Runde nachweislich jemand **Platz 1** feststeht (Client-Meldung
  oder Replay-Auswertung — `scrim_rounds.finished_at`, gesetzt von
  `_mark_round_finished_if_winner_known` in `app.py`), schließt sich die
  Runde **automatisch** `ROUND_AUTO_COMPLETE_DELAY` (15 Minuten) später
  selbst ab: Platzierungen (Priorität Client > Replay > 🧮 Berechnet) werden
  final übernommen und Credits vergeben — **keine Admin-Bestätigung nötig**
  (`settle_finished_rounds_if_needed`, läuft lazy bei jedem authentifizierten
  Request, kein Cronjob nötig, analog zu `settle_expired_rounds_if_needed`
  für automatisch stornierte Runden). Die 15 Minuten Puffer lassen Zeit für
  Nachzügler (langsamerer Client, Replay-Upload) einlaufen, bevor final
  vergeben wird. Der Admin kann Platzierungen im Admin-Bereich trotzdem
  **jederzeit** — auch nach dem automatischen Abschluss — von Hand
  korrigieren (`POST /api/admin/matches/<id>/results`, Button „Ergebnisse
  eintragen" bzw. nach Abschluss „Ergebnisse bearbeiten"); Credits werden
  dabei als Differenz zum bisherigen Wert verbucht, ein wiederholter oder
  korrigierender Aufruf zahlt also nie doppelt aus, und ein geleertes
  Platzierungsfeld bucht das Preisgeld vollständig zurück. Bekommt in einer
  Runde niemand eine Platz-1-Meldung (z.B. weil der Gewinner den Client
  vergessen hat), bleibt sie einfach offen, bis ein Admin sie manuell
  abschließt — genau wie bisher.
  1. **🖥️ Client**: der SP-Client meldet die eigene Platzierung aus
     Fortnites Live-Log (siehe `client/README.md`). Bei Duo/Trio reicht es,
     wenn **ein** Team-Mitglied den Client aktiviert hat — ein Team wird in
     Fortnite immer gemeinsam eliminiert, die gemeldete Platzierung gilt
     deshalb automatisch fürs ganze Team (`api_client_report` in `app.py`,
     überschreibt aber nie eine bereits vorhandene Platzierung eines
     Teamkollegen, z. B. aus dessen eigener Meldung oder einem manuellen
     Admin-Eintrag).
  2. **🎬 Replay**: der SP-Client lädt zusätzlich automatisch die von
     Fortnite gespeicherte Replay-Datei hoch. Anders als das Live-Log
     enthält eine Replay-Datei die Eliminierungs-Reihenfolge der **ganzen
     Lobby** — eine einzige hochgeladene Datei kann daher Platzierungen für
     alle Teilnehmer mit verknüpftem Epic-Account liefern, auch für die,
     deren eigener Client nicht lief. Auswertung per Node-Subprozess
     (`replay_parser/`, siehe dortige Doku und `apply_replay_placements`
     in `app.py`) — braucht Node.js auf dem Server (siehe Deployment
     unten), fällt sonst einfach weg, kein harter Fehler.

     **Sicherheits-Check gegen unterschobene Matches**: Der Client erkennt
     eine Runde nur über das Zeitfenster um die Startzeit, nicht darüber,
     ob wirklich die per Match-Code verteilte Lobby gespielt wurde — wer
     stattdessen ein beliebiges anderes Match im selben Zeitfenster
     hochlädt, könnte sich sonst eine falsche Platzierung erschleichen
     (auch die eigene). Deshalb übernimmt `apply_replay_placements` aus
     einer Replay **gar keine** Platzierung — auch nicht die des
     Uploaders selbst — wenn keiner der anderen, per Epic-Account
     verknüpften Rundenteilnehmer darin als eliminiert auftaucht. Gibt es
     keine anderen verknüpften Teilnehmer, lässt sich das nicht prüfen und
     es bleibt beim bisherigen Best-Effort.
     Reicht ein einfacher "kommt mindestens einer vor"-Check nicht (zwei
     Komplizen, die beide für dieselbe größere Runde angemeldet sind,
     könnten sich sonst gegenseitig "bestätigen", indem sie stattdessen
     zusammen eine andere Runde spielen, für die sie ebenfalls beide
     angemeldet sind): Die Übereinstimmung wird zusätzlich gegen **alle**
     offenen Runden verglichen, für die der Uploader angemeldet ist
     (`_other_participants_epic_ids` in `app.py`) — nur wenn die
     angegebene Runde dabei die beste (oder gleichauf beste)
     Übereinstimmung hat, werden Platzierungen übernommen. Passt eine
     andere Runde besser, wird nichts übernommen (Logeintrag, kein harter
     Fehler).

     **Grenze bei Duo/Trio**: Eine Replay-Datei liefert zuverlässig nur die
     Platzierung des **eigenen Teams** (`ownPlacement` kommt direkt vom
     Spiel als Team-Zahl, z. B. Platz 21 von ~50 Teams) — das hilft
     weiterhin auch Teamkollegen ohne eigene Client-Meldung. Für **andere**
     Teams wird bewusst **nichts** hergeleitet: `totalPlayers` zählt
     einzelne Spieler (nicht Teams), und die `playerElim`-Events enthalten
     keine Team-Zuordnung für fremde Spieler — ein rechnerischer
     "Rang unter allen Spielern" wäre keine echte Team-Platzierung und
     würde das Leaderboard verfälschen. Mit einer echten Duo-Replay
     verifiziert (100 Spieler, ~50 Teams, eigene Platzierung 21). Andere
     Teams brauchen daher ihre eigene Client-Meldung oder eine eigene
     Replay-Datei von einem ihrer Mitglieder.
  3. **Manueller Replay-Upload**: Rückfalloption, falls der SP-Client aus
     irgendeinem Grund nicht lief oder der automatische Upload fehlschlug.
     Angemeldete Teilnehmer sehen auf der Match-Detailseite (sobald sie
     beigetreten und akzeptiert sind, solange die Runde offen ist) ein
     Upload-Feld und können ihre `.replay`-Datei direkt über die Website
     hochladen (`POST /api/matches/<id>/replay`, session-authentifiziert,
     dasselbe Zeitfenster wie beim Client-Upload). Läuft danach durch
     denselben `apply_replay_placements`-Pfad wie ein Client-Upload (inkl.
     aller Sicherheits-Checks oben) — bleibt aber, anders als die
     temporären Client-Uploads, dauerhaft gespeichert
     (`uploads/manual_replays/`) und in der Tabelle
     `manual_replay_uploads` nachvollziehbar. Admin-Bereich → "Manuelle
     Replay-Uploads" → "Hochgeladene Replays anzeigen" listet alle
     Uploads mit Status (übernommen / nichts Neues / falsche Runde
     vermutet / nicht lesbar / …) und bietet pro Eintrag eine Detailansicht
     inkl. Download der Originaldatei.
  4. **🧮 Berechnet**: rein rechnerische Lücken-Herleitung, wenn für alle
     bis auf eine Person/ein Team der Runde bereits Platzierungen bekannt
     sind und diese lückenlos 1..T (T = Anzahl Teams/Spieler) bis auf genau
     eine Zahl abdecken — dann ist die fehlende Platzierung mathematisch
     eindeutig (`infer_missing_placement` in `app.py`). Greift bewusst
     *nur* bei genau einer Lücke; bei mehreren fehlenden Platzierungen wäre
     nicht eindeutig, wem welcher Wert zusteht.
- **Problem melden**: neben dem manuellen Replay-Upload gibt es einen
  kleinen, unabhängigen „⚠️ Problem melden"-Knopf — ein Teilnehmer kann
  jederzeit kurz in einem Freitextfeld beschreiben, dass bei einer Runde
  etwas nicht gestimmt hat (`POST /api/matches/<id>/problem-report`,
  Tabelle `round_problem_reports`). Da Runden sich jetzt automatisch
  abschließen, ist das der einzige verlässliche Ort, an dem ein Problem
  sonst nicht zwangsläufig auffallen würde. Admin-Bereich → „Problem-
  Meldungen" listet alle offenen/erledigten Meldungen inkl. Beschreibung.
- **Auszahlung** setzt zwei Dinge voraus: vorhandenes **Guthaben** (nicht
  Credits!) **und** hinterlegte Bankdaten. IBAN/BIC werden verschlüsselt
  gespeichert (Fernet-Schlüssel aus `SECRET_KEY` abgeleitet), nie im
  Klartext an den Browser zurückgegeben. Eine Auszahlungsanfrage bucht das
  Guthaben sofort ab und landet als Datenbank-Eintrag im Admin-Bereich —
  es wird **keine** automatische Überweisung ausgelöst. Die tatsächliche
  Zahlung ist eine **manuelle SEPA-Überweisung**, die der Admin selbst in
  seinem eigenen Online-Banking ausführt (siehe unten).

**Admin-Bereich** unter `/admin` (nur für User-IDs in `ADMIN_USER_IDS` in
`.env`, komma-getrennt): Match-Runden erstellen, Platzierungen eintragen
(vergibt automatisch Credits), Auszahlungsanfragen genehmigen/ablehnen/als
ausgezahlt markieren. Ein abgelehnter Antrag erstattet das Guthaben
automatisch zurück.

**Manuelle SEPA-Auszahlung — Ablauf für den Admin**:
1. Bei einer **ausstehenden** Anfrage auf "Bankdaten anzeigen" klicken —
   IBAN/BIC/Adresse/Verwendungszweck werden serverseitig entschlüsselt und
   angezeigt. Jeder einzelne Abruf wird mit Admin-ID und Zeitstempel in der
   Tabelle `payout_bank_detail_views` protokolliert (Audit-Trail für diese
   personenbezogenen Zahlungsdaten).
2. Auf "Genehmigen" klicken, sobald die Anfrage inhaltlich in Ordnung ist.
3. Die Überweisung **selbst** im eigenen Online-Banking ausführen (Betrag,
   IBAN/BIC und Verwendungszweck aus Schritt 1 übernehmen).
4. Erst danach auf "Ich habe überwiesen – als ausgezahlt markieren"
   klicken. Ein direkter Sprung von "Ausstehend" zu "Ausgezahlt" ist
   serverseitig blockiert — es muss erst "Genehmigt" durchlaufen werden.
   Wer wann als "ausgezahlt" markiert hat, wird in `paid_by`/`paid_at`
   festgehalten und im Admin-Bereich angezeigt.

Dieser Ablauf löst zu keinem Zeitpunkt automatisch eine echte Überweisung
aus — die Geldbewegung bleibt immer eine bewusste, manuelle Handlung des
Admins im eigenen Banking.

**Relevante Endpunkte**: `/api/plan`, `/api/plans/checkout`,
`/api/plans/checkout/confirm`, `/webhook/stripe`,
`/api/matches`, `/api/matches/<id>/join`, `/api/matches/requests`,
`/api/matches/requests/<id>/accept`, `/api/matches/requests/<id>/decline`,
`/api/shop`, `/api/shop/redeem`, `/api/transactions`,
`/api/payout/bank-details`, `/api/payout/request` (nimmt `amountCents`),
`/api/payout/requests`, `/api/admin/payout-requests/<id>/bank-details`
(entschlüsselte Bankdaten, protokolliert), sowie unter `/api/admin/...`
die übrigen Admin-Gegenstücke. Tabellen: `users` (Spalten `credits`,
`snipes`, `guthaben_cents`), `user_plans` (Spalte `credits_converted`
verhindert doppelte Umwandlung, `stripe_session_id` verhindert doppelte
Gutschrift pro Zahlung), `credit_transactions`, `guthaben_transactions`,
`scrim_rounds` (Spalte `team_size`: 1=Solo/2=Duo/3=Trio),
`scrim_participants` (Spalten `team_id`, `status`: pending/accepted),
`payout_bank_details`, `payout_requests` (Spalten `amount_cents`,
`paid_by`, `paid_at`), `payout_bank_detail_views` (Audit-Log für jeden
Bankdaten-Abruf durch einen Admin).

### Echte Zahlung mit Stripe

Der Masterclass-Kauf läuft über **Stripe Checkout** — es wird wirklich
Geld abgebucht, kein simulierter Kauf mehr:

1. **Stripe-Konto erstellen**: auf https://dashboard.stripe.com/register
   registrieren (Name, E-Mail, Land). Für den Start reicht das — Firmen-
   /Bankdaten für echte Auszahlungen an dich trägst du erst nach, wenn du
   vom Test- in den Livemodus wechselst.
2. **Testmodus-Keys holen**: im Dashboard oben rechts sicherstellen, dass
   "Testmodus" aktiv ist, dann Entwickler -> API-Schlüssel ->
   `Publishable key` (`pk_test_...`) und `Secret key` (`sk_test_...`)
   kopieren und in `.env` als `STRIPE_PUBLISHABLE_KEY` /
   `STRIPE_SECRET_KEY` eintragen.
3. **Weitere Zahlungsarten aktivieren** (PayPal, Klarna, SEPA-Lastschrift,
   Amazon Pay, eps, ...): im Dashboard unter Einstellungen ->
   Zahlungsmethoden die gewünschten Methoden aktivieren. Der Code schreibt
   bewusst **keine feste Liste** vor — auf der Checkout-Seite erscheint
   automatisch alles, was im Dashboard aktiviert ist, ganz ohne
   Code-Änderung. Testmodus und Livemodus haben **getrennte**
   Einstellungen — also beides einzeln aktivieren. Ohne Aktivierung bleibt
   einfach nur die Kartenzahlung sichtbar, es gibt keinen Fehler.
   **PayPal** braucht zusätzlich eine bei Stripe registrierte, öffentlich
   erreichbare Domain (Dashboard -> PayPal -> "Domains konfigurieren") —
   auf `localhost` bleibt es deshalb unsichtbar, selbst wenn aktiviert;
   erst nach dem Go-Live auf der echten Domain registrieren.
   **paysafecard wird von Stripe nicht angeboten** (steht nicht in der
   Liste der über 30 verfügbaren Zahlungsmethoden) — dafür wäre ein
   separater, zusätzlicher Zahlungsanbieter nötig (z.B. Mollie, Adyen,
   Novalnet), was hier bewusst nicht umgesetzt wurde.
4. **Webhook (optional für lokale Tests, empfohlen für Produktion)**: Ohne
   Webhook funktioniert der Kauf trotzdem — `/api/plans/checkout/confirm`
   fragt beim Rücksprung von Stripe direkt den Zahlungsstatus ab und
   schaltet den Plan frei. Der Webhook ist eine zusätzliche Absicherung
   für den Fall, dass jemand den Tab vor dem Rücksprung schließt. Für
   lokale Tests: `stripe listen --forward-to localhost:8000/webhook/stripe`
   (Stripe CLI, `brew install stripe/stripe-cli/stripe`), das dabei
   ausgegebene `whsec_...` als `STRIPE_WEBHOOK_SECRET` eintragen. In
   Produktion: Dashboard -> Entwickler -> Webhooks -> Endpunkt hinzufügen
   -> `https://<deine-domain>/webhook/stripe`, Event
   `checkout.session.completed` auswählen, das dort erzeugte "Signing
   secret" als `STRIPE_WEBHOOK_SECRET`.

   **"Mit Guthaben kaufen" (Shop -> 💶 Mit Guthaben) läuft nicht über
   Stripe/den Webhook**: Derselbe Masterclass-Plan wie der Einmalkauf, aber
   direkt aus dem Guthaben des Nutzers bezahlt (dem Betrag, den man sich
   zuvor im Shop aus Credits umgewandelt hat) statt mit Karte, und dafür
   `GUTHABEN_DISCOUNT_CENTS` (50 Cent) günstiger. Das ist ein **einmaliger
   Kauf** — anders als ein klassisches Abo gibt es dafür bewusst keine
   automatische Abbuchung und keine Kündigung; reicht das Guthaben beim
   Kauf nicht, kommt sofort eine Fehlermeldung (Toast) zurück, ohne dass
   sich am Guthaben etwas ändert.
5. **Mit Testkarten zahlen**: beim Klick auf "Angebot wählen" öffnet sich
   die echte Stripe-Checkout-Seite. Im Testmodus nie eine echte Karte
   eingeben — Testkarte `4242 4242 4242 4242`, beliebiges zukünftiges
   Ablaufdatum, beliebiger CVC/Postleitzahl. Nach erfolgreicher Zahlung
   leitet Stripe zurück zu ScrimPass, der Plan wird sofort freigeschaltet.
   Für PayPal und andere Methoden testet Stripe je nach Methode mit
   eigenen Test-Flows (im Dashboard bei der jeweiligen Zahlungsmethode
   verlinkt).
6. **Live schalten**: erst wenn alles im Testmodus sauber durchläuft, im
   Dashboard oben rechts auf "Live-Modus" wechseln, dort die
   Unternehmens-/Bankdaten hinterlegen (Stripe prüft das), dann die
   `pk_live_...`/`sk_live_...`-Keys sowie einen neuen Live-Webhook mit
   eigenem `whsec_...` in die **Produktions**-Umgebungsvariablen (z.B. bei
   Render) eintragen — niemals Live-Keys in die lokale `.env` mit
   Testdaten mischen.
7. Ist `STRIPE_SECRET_KEY` (noch) nicht gesetzt, meldet
   `/api/plans/checkout` einen klaren Fehler statt einen Plan gratis zu
   vergeben — es gibt keinen ungesicherten Fallback.

**Wie die Freischaltung technisch abläuft**: Klick auf "Angebot wählen"
→ `/api/plans/checkout` erstellt eine Stripe Checkout Session und leitet
dorthin weiter → nach Zahlung leitet Stripe zurück zu
`/?checkout=success&session_id=...` → das Frontend ruft
`/api/plans/checkout/confirm` auf, das den Zahlungsstatus **serverseitig
bei Stripe** nachprüft (dem Redirect allein wird nicht vertraut) und erst
dann den Plan über `grant_plan()` gutschreibt. Der Webhook ruft dieselbe
Funktion auf. Beide Wege sind über `user_plans.stripe_session_id`
idempotent — dieselbe Zahlung kann nicht doppelt gutgeschrieben werden,
auch wenn Webhook und Rücksprung-Bestätigung beide feuern. Läuft ein
vorheriger Plan noch, wird die neue Laufzeit addiert (Stacking), siehe
oben.

## Sicherheit

- **Rate-Limiting** (`flask-limiter`): ein Grundlimit von 200 Anfragen/Stunde
  bzw. 40/Minute pro IP für alles, plus engere Grenzen für besonders
  empfindliche Endpunkte — Login-Start (10/Min), Spielersuche (30/Min),
  Cheat-Meldungen (5/Stunde), Client-Pairing-Code einlösen (10/Min, schützt
  vor Erraten des Codes). Der Stripe-Webhook ist ausgenommen
  (`@limiter.exempt`), da er server-seitig von Stripe kommt. Zählt aktuell
  im Speicher des einzelnen Prozesses — bei mehreren Workern/Dynos bräuchte
  es einen gemeinsamen Speicher (`storage_uri="redis://..."`, siehe
  [Flask-Limiter-Doku](https://flask-limiter.readthedocs.io)).
- **Session-Cookie**: `HttpOnly` und `SameSite=Lax` immer aktiv. `Secure`
  (nur über HTTPS senden) ist standardmäßig **aus**, damit der lokale
  Dev-Server über `http://localhost` noch funktioniert — im Produktivbetrieb
  mit echter HTTPS-Domain `SESSION_COOKIE_SECURE=1` setzen (siehe
  `.env.example`).
- Es gibt **keinen automatisierten Schutz gegen Brute-Force auf den Login
  selbst** über das hinaus, was Discord/Google/Epic dort ohnehin
  bereitstellen — die App verwaltet keine eigenen Passwörter.

## Tests

Automatisierte Tests für die Backend-Flows, die sich ohne echtes
Discord/Google-Login, echte Stripe-Zahlung oder echtes Windows/Fortnite
prüfen lassen (Gast-Zugriff, Beitreten, Mindestteilnehmer-Stornierung,
Bann-Kaskade, Teams, SP-Client-Pairing, Guthaben-Kauf, Rate-Limiting):

```bash
pip3 install -r requirements-dev.txt
python3 -m pytest tests/ -v
```

Jeder Test läuft gegen eine frische Kopie des Projekts in einem Temp-Ordner
mit einer leeren, neu initialisierten Datenbank (`tests/conftest.py`) —
nichts davon fasst `scrimpass.db` oder `.env` an. Alles, was echte externe
Dienste braucht (OAuth-Logins, Stripe-Zahlungen, ein echtes Match in
Fortnite), bleibt weiterhin manuell zu testen.

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
   - Build Command: siehe unten (Node.js für die Replay-Auswertung wird
     zusätzlich gebraucht, Render's Python-Umgebung bringt das nicht mit)
   - Start Command: `gunicorn app:app`

   Build Command (installiert Python- **und** Node-Abhängigkeiten; die
   Replay-Auswertung fällt ohne Node einfach weg, kein harter Fehler, aber
   für "🎬 Replay"-Platzierungen wird es gebraucht) — **so tatsächlich auf
   Render getestet und live bestätigt**:
   ```bash
   pip install -r requirements.txt && curl -fsSL https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.xz -o /tmp/node.tar.xz && mkdir -p ./node-runtime && tar -xJf /tmp/node.tar.xz -C ./node-runtime --strip-components=1 && ./node-runtime/bin/npm install --prefix replay_parser
   ```
   Node landet damit repo-relativ unter `./node-runtime` — das bleibt
   zwischen Build und Laufzeit erhalten (Render's native Umgebung, kein
   Docker-Multi-Stage-Build), im Unterschied zu z.B. `/opt/...`, das nicht
   garantiert bestehen bleibt. `app.py` nutzt `./node-runtime/bin/node`
   automatisch, falls vorhanden (`NODE_BIN`), sonst das system-eigene
   `node` auf dem `PATH` (lokale Entwicklung) — keine weitere
   PATH-Konfiguration in Render nötig. Nebenbefund: Render erkennt
   `replay_parser/package.json` selbst und installiert zusätzlich eine
   eigene Node-Version für den Build-Schritt — das ist unabhängig von der
   oben beschriebenen und kein Problem, wird hier aber nicht verwendet.
4. **Persistent Disk hinzufügen** (Render-Dashboard -> Service -> Disks):
   mind. 1 GB, Mount-Pfad `/opt/render/project/src` (oder den Projektordner) —
   **wichtig**, sonst wird `scrimpass.db` bei jedem Deploy/Neustart gelöscht,
   da der Dateisystem-Speicher ohne Disk nicht dauerhaft ist. Persistent
   Disks gibt es erst ab einem bezahlten Plan (kein Gratis-Tier).
5. **Umgebungsvariablen setzen** (Service -> Environment):
   `SECRET_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `DISCORD_REDIRECT_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET`,
   `EPIC_REDIRECT_URI`, `ADMIN_USER_IDS` (Werte aus deiner lokalen `.env`,
   aber mit der Render-URL statt `localhost:8000`, z.B.
   `https://scrimpass.onrender.com/auth/discord/callback`), sowie
   `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   (siehe Abschnitt "Echte Zahlung mit Stripe" oben — für den Live-Betrieb
   die `pk_live_`/`sk_live_`-Keys und einen eigenen Live-Webhook auf
   `https://<deine-render-domain>/webhook/stripe` verwenden, nicht die
   Testmodus-Keys aus der lokalen `.env`).
6. **Redirect-URIs aktualisieren**: Im Discord Developer Portal
   (OAuth2 -> Redirects) und im Epic Developer Portal (Client ->
   Umgeleitete URL) die neue Render-URL statt `localhost:8000` eintragen.
7. Deploy abwarten — Render gibt automatisch eine `https://...onrender.com`-
   Domain inkl. HTTPS. Eine eigene Domain lässt sich später unter Settings ->
   Custom Domain verknüpfen.

## Nächste Schritte (falls gewünscht)

- **Yunite-/Warlegend-Anbindung** für automatische Ergebnis-Erfassung statt
  manueller Eingabe im Admin-Bereich.
- Die manuelle SEPA-Auszahlung rechtlich absichern lassen (Glücksspiel-/
  Gewinnspielrecht, ggf. KYC/AML je nach Land) — das ist keine Code-Aufgabe,
  sondern eine Rechtsberatung, die vor dem ersten echten Auszahlungslauf
  passieren sollte.
- Weitere Verbindungen (Twitch, X) genauso an echte OAuth2-Flows anbinden
  (beide haben normale Web-OAuth2-Flows wie Discord).
- Von SQLite auf eine "richtige" Datenbank (z.B. Postgres) wechseln, falls
  das Projekt über einen einzelnen Server hinaus skalieren soll.
