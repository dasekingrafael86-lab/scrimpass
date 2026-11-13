# ScrimPass Companion-Client

Windows-Programm, das Scrim-Ergebnisse automatisch meldet. **Für Spieler gibt
es nichts einzustellen:** herunterladen, vor der Runde starten, fertig. Es
öffnet sich kein Fenster und es wird nichts abgefragt — nur unten rechts in
der Taskleiste (System Tray) erscheint ein ScrimPass-Symbol, daran sieht man
zuverlässig, dass der Client aktiv läuft.

## Für Spieler

1. In ScrimPass links oben auf **SP-Client** -> **Client herunterladen**.
   Die Datei ist schon mit deinem Konto verknüpft (Code und Server-Adresse
   stecken im Dateinamen — bitte nicht umbenennen).
2. Datei **einmal** starten (Doppelklick). Danach läuft sie im Hintergrund
   weiter; unten rechts in der Taskleiste erscheint das ScrimPass-Symbol
   (🟢) — Mauszeiger drüberhalten zeigt "ScrimPass-Client – Aktiv (dein
   Name)". Auf der SP-Client-Seite in ScrimPass erscheint dein PC zusätzlich
   mit dem Status "● AKTIV". Der Client trägt sich dabei automatisch in den
   Windows-Autostart ein — du musst ihn danach nicht mehr manuell starten,
   er läuft ab dem nächsten PC-Start von selbst mit.
3. Normal spielen. Der Client meldet sich für alle Runden, für die du
   angemeldet bist, selbst an und trägt nach dem Match die Platzierung ein.
   Sobald jemand nachweislich Platz 1 erreicht hat, schließt sich die Runde
   15 Minuten später automatisch ab und Credits werden vergeben — ganz ohne
   Admin-Bestätigung (ein Admin kann Platzierungen trotzdem jederzeit im
   Nachhinein korrigieren).

Wichtig:
- **Am besten vor dem offiziellen Rundenstart starten** — geht aber auch
  problemlos deutlich früher (Stunden vorher ist kein Problem). Bis zu 5
  Minuten nach dem offiziellen Start zählt die Aktivierung für die eigene
  Platzierungsmeldung noch (Kulanz für Ladebildschirm-/Bus-Verzögerung).
  Wer noch später startet: die **Replay-Datei wird trotzdem hochgeladen**
  (siehe unten) — und die ist für Platzierung und Kills maßgeblich.
- **Replay-Aufzeichnung muss in Fortnite an sein** (Einstellungen → Spiel →
  Wiederholungen → "Wiederholungen aufzeichnen", Standard: an). Findet der
  Client nach einem Match keine Aufnahme, weist er einmal per Tray-Hinweis
  darauf hin.
- Nur Matches im Zeitfenster um die Startzeit der Runde zählen — andere Matches
  in der Zwischenzeit werden ignoriert.
- **Beenden**: Rechtsklick auf das Tray-Symbol -> **Beenden** — oder
  Task-Manager -> `ScrimPassClient.exe`, oder in ScrimPass unter SP-Client ->
  **Trennen** (der Client beendet sich dann selbst und entfernt sich dabei
  auch wieder aus dem Windows-Autostart). "Beenden" allein lässt den
  Autostart-Eintrag bestehen — der Client läuft dann beim nächsten
  PC-Start trotzdem wieder mit.
- Wer den automatischen Start mit Windows nicht möchte: Windows-Einstellungen
  -> Apps -> Autostart -> "ScrimPassClient" deaktivieren.
- Doppelklick auf das Tray-Symbol öffnet ScrimPass im Browser.
- Das einzige Fenster, das der Client je anzeigt, ist ein Fehlerfenster, wenn er
  sich nicht mit ScrimPass verbinden kann (Download-Code abgelaufen/schon
  benutzt). Dann die Datei einfach erneut herunterladen.
- **Update-Hinweis**: Ist auf dem Server eine neuere Client-Version
  bereitgestellt als die gerade laufende, zeigt das Tray-Symbol einmalig eine
  Benachrichtigung ("ScrimPass-Update verfügbar") — der Client aktualisiert
  sich nicht selbst, es muss dann einfach eine neue `.exe` heruntergeladen
  werden.
- Protokoll: `%APPDATA%\ScrimPass\client.log`.

## Für den Betreiber: .exe bauen

Die `.exe` muss einmal auf einem **Windows-PC mit Python** gebaut werden
(PyInstaller kann nicht für Windows cross-kompilieren):

```
build_exe.bat
```

(Doppelklick im Ordner `client/`.) Ergebnis: `client/dist/ScrimPassClient.exe`.
Genau von dort liefert ScrimPass sie aus — jeder Download bekommt einen
eigenen Dateinamen `ScrimPassClient_<CODE>_<SERVER>.exe` mit einem einmaligen,
12 Stunden gültigen Code. Bei einem neuen Build die Datei einfach ersetzen.

**Bei jedem neuen Build**: nur `CLIENT_VERSION` in `client/scrimpass_client.py`
hochzählen. `build_exe.bat` übernimmt die Nummer selbst in die Metadaten der
`.exe` (`version_info.txt`) und schreibt sie nach `client/dist/version.txt` —
daraus liest ScrimPass, welche Version bereitsteht, und schon laufende ältere
Clients zeigen den Update-Hinweis. Nach dem Build **beide** Dateien committen
und pushen: `client/dist/ScrimPassClient.exe` und `client/dist/version.txt`.
Aus einem Skript ohne Tastendruck am Ende: `build_exe.bat nopause`.

Server-Adresse: standardmäßig die Adresse, unter der der Download aufgerufen
wurde. Hinter einem Proxy (Render o. Ä.) `PUBLIC_BASE_URL` in `.env` setzen,
z. B. `https://scrimpass.onrender.com`.

Zum Testen ohne .exe: `python scrimpass_client.py --server http://localhost:8000 --code <CODE>`
(einen Code liefert der Download, der Dateiname enthält ihn).

## Replay-Upload (maßgeblich für Platzierung, Kills und Lobby-Prüfung)

Fortnite zeichnet jedes Match als Replay-Datei auf
(`%LOCALAPPDATA%\FortniteGame\Saved\Demos`). Der Client lädt sie nach dem
Match von selbst hoch — niemand muss etwas von Hand tun. Der Server liest
daraus die Eliminierungen der **ganzen Lobby**: Reihenfolge des Ausscheidens
(= Platzierungen aller Angemeldeten), wer wen eliminiert hat (= Kills) und wer
überhaupt mitgespielt hat (nicht angemeldete Spieler werden gestrichen). Es
reicht also **ein** Replay pro Match von jemandem, der bis zum Ende dabei war
(z. B. der Sieger) — kürzere Replays früh Ausgeschiedener ergänzen das nur.

Der Upload ist doppelt abgesichert:

1. **Angestoßen vom Log** (Matchende erkannt) — wie bisher.
2. **Replay-Wächter**: unabhängig vom Log schaut der Client alle 20 Sekunden in
   den Replay-Ordner und lädt jede fertig aufgezeichnete Datei hoch, deren
   Match im Zeitfenster einer angemeldeten Runde begann (Beginn aus dem
   Dateinamen `UnsavedReplay-JJJJ.MM.TT-HH.MM.SS.replay`). Das greift auch,
   wenn der Client erst mitten im Match gestartet wurde, das Log die
   Platzierung nicht hergab oder man lange zugeschaut hat.

Jede Datei wird nur einmal hochgeladen (gemerkt in
`%APPDATA%\ScrimPass\uploaded_replays.json`). Fortnite schließt die Aufnahme
erst ab, wenn man **zurück in der Lobby** ist — wer Fortnite direkt nach dem
Match beendet, hinterlässt eine unfertige, nicht auswertbare Datei. Ob ein
Replay wirklich zur Runde gehört, prüft der Server am Inhalt (genug
angemeldete Spieler darin, dasselbe Match wie schon ausgewertete Replays); bei
Turnieren mit mehreren Spielen ordnet er es selbst dem richtigen Spiel zu.

## Wie die Erkennung der eigenen Platzierung funktioniert

Fortnite loggt die Platzierung selbst nirgendwo als Klartext-Zahl. Der Client
nutzt die Discord/Epic-"Rich Presence"-Statuszeile (z. B.
`Reload Build Ranked Solo – 18 übrig`), die sich während des Matches live mit
der Anzahl verbleibender Spieler/Teams aktualisiert. Meldet das Log
`LocalPlacementChanged` (die eigene Platzierung steht fest), gilt das nächste
"X übrig" — im echten Log ~1,3 s später — als finale Platzierung. Danach
ändert Zuschauen nichts mehr.

Gegen ein echtes deutsches Fortnite-Log geprüft: drei Matches, erkannt wurden
Platz 18, 17 und 9 (jeweils exakt der Stand bei der Elimination).

### Einschränkungen

- **Die Platzierungsmeldung aus dem Log ist selbstgemeldet.** Der Client läuft
  auf dem PC des Spielers und kann grundsätzlich manipuliert werden; er kann
  außerdem nicht beweisen, *welches* Match gespielt wurde. Sobald für eine
  Runde ein Replay ausgewertet ist, zählt deshalb nur noch das Replay — die
  Meldung aus dem Log ist dann nur der Rückfall für Runden ganz ohne Replay.
- Rich Presence muss aktiv sein (Standard), sonst gibt es keine Daten.
- Bisher nur mit **deutschsprachigem** Fortnite geprüft ("X übrig"). Ein Muster
  für Englisch ("X remaining") ist vorbereitet, aber ungetestet.
- **Platz 1 (Sieg)** war in den vorhandenen Logs nicht enthalten und ist
  unverifiziert.
- Bei exakt gleichzeitigen Eliminierungen kann der Wert in seltenen Fällen um 1
  abweichen.
- Nur Windows (Log-Pfad `%LOCALAPPDATA%\FortniteGame\Saved\Logs\FortniteGame.log`).

## Replay-Upload (Platzierungen für die ganze Lobby)

Zusätzlich zur eigenen Platzierungsmeldung lädt der Client nach jedem
erkannten Match automatisch die von Fortnite gespeicherte Replay-Datei
hoch (`%LOCALAPPDATA%\FortniteGame\Saved\Demos`, Aufzeichnung ist
standardmäßig an — nichts einzustellen). Der Server wertet sie aus und
kann daraus Platzierungen für **alle** Teilnehmer der Runde mit
verknüpftem Epic-Account rekonstruieren, nicht nur für den Uploader —
robust auch wenn mehrere andere Mitspieler ihren eigenen Client vergessen
haben zu aktivieren. Details zur Server-Seite: `replay_parser/` und
`app.py` (`apply_replay_placements`).

Das ist ein reines Zusatzfeature: Findet der Client innerhalb von zwei
Minuten nach Matchende keine neue Replay-Datei, oder schlägt der Upload
fehl, bleibt einfach alles beim bisherigen Stand (🖥️ Client-Meldung,
🧮 rechnerische Herleitung, manuelle Admin-Eingabe).
