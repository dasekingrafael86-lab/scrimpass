# TikTok-Erklärvideos („kurzsimuliert“-Stil)

Animierte Erklärvideos aus Code: Remotion (React) rendert die Grafik, eine KI-Stimme spricht, Untertitel und Animationen laufen auf die Wort-Zeitstempel der Stimme.

## Einmalig

```bash
brew install node ffmpeg
cd tiktok && npm install
```

## Ein Video bauen

1. **Skript**: `src/videos/<id>/script.json`, eine Zeile pro Satz, jede mit einer `id`.
   - `text` ist das, was in den Untertiteln steht.
   - `speak` (optional) ist die Aussprache, z. B. „F P S“.
   - `pause` (optional) ist die Stille nach dem Satz in Sekunden.
   - `rate` (optional) ist das Sprechtempo dieser Zeile, z. B. schneller für die ersten 3 Sekunden.
2. **Stimme**:
   ```bash
   python3 scripts/voice.py <id>
   ```
   Das schreibt `public/<id>/voice.wav` und `src/videos/<id>/timing.json`.
   - Standard ist die macOS-Stimme „Anna“ (kostenlos, offline).
   - Mit `ELEVENLABS_API_KEY` und `ELEVENLABS_VOICE_ID` in der Umgebung nimmt das Skript ElevenLabs (klingt deutlich besser).
3. **Szenen**: `src/videos/<id>/Video.tsx`.
   - Die Szenen hängen an den Zeilen-IDs: `T.s('frame2')` ist der Start der Zeile, `T.w('frame2', '16')` der Moment, in dem das Wort gesprochen wird.
   - Wenn sich die Stimme ändert, wandert alles automatisch mit.
   - Neue Videos in `src/Root.tsx` als `<Composition>` eintragen.
4. **Ansehen und Rendern**:
   ```bash
   npm run studio                                  # Live-Vorschau im Browser
   npx remotion render <id> out/<id>.mp4 --crf=18  # fertiges MP4, 1080×1920
   ```

## Bausteine (`src/components/Kit.tsx`)

| Baustein | Zweck |
|---|---|
| `Backdrop` | Nachthimmel |
| `HudTile` | Kachel mit Label und großer Zahl |
| `Pill` | Badge oder Button |
| `Txt` | Text |
| `Scene` | Ein- und Ausblenden |
| `Captions` | Untertitel mit 2–3 Wörtern |
| `Handle` | Handle unten rechts |

Farben stehen in `src/lib/theme.ts`: Orange = das, dem wir folgen, Rot = Gefahr/Nachteil, Türkis = Vergleich.

## Kamera (`src/lib/camera.tsx`)

Alle Szenen eines Videos liegen nebeneinander in einer großen „Welt“ (`Place at={[x, y]}`), und eine virtuelle Kamera (`World track={cam}`) fährt durch sie hindurch, statt dass geschnitten wird:

| Befehl | Wirkung |
|---|---|
| `cut(f, cam)` | Start-Einstellung |
| `to(f, dauer, cam, 'smooth' \| 'whip' \| 'snap' \| 'linear')` | Fahrt/Zoom zu einem Punkt; `whip` = schneller Reißschwenk |
| `follow(von, bis, f => cam)` | Kamera verfolgt ein bewegtes Objekt (wie die fallende Münze) |
| `shake(f, stärke)` | Wackler bei einem Einschlag/Treffer |

Bewegungsunschärfe entsteht automatisch aus der Kamerageschwindigkeit, die Sterne ziehen mit Parallaxe mit, und eine leichte Handkamera-Bewegung hält auch ruhige Einstellungen lebendig. `soft(px)` macht unscharf, was gerade nicht im Fokus ist (Fokuswechsel). HUD, Badges (PAUSE, WIEDERHOLUNG, ZEITLUPE) und Untertitel liegen fest über der Kamera.

Faustregel: Alle 1–2 Sekunden bewegt sich die Kamera. Jeder neue Gedanke bekommt eine neue Einstellung (Nahaufnahme → Totale → Reißschwenk), und die Szenen müssen so weit auseinanderliegen, dass eine Totale nichts von den Nachbarn zeigt.

## Regeln für das Skript

- Sekunde 0–6: eine Ja/Nein-Frage stellen und den Zuschauer entscheiden lassen.
- Dann die Überraschung, dann den Mechanismus, dann Zahlen als Beleg und am Ende eine klare Antwort in einem Wort.
- Kurze Sätze, 2. Person, jede Zahl nachrechnen.
- Alle 2–3 s ändert sich etwas im Bild, aber es bleibt eine Kulisse ohne harte Schnitte.
- Keine Spielgrafik, keine Logos von Epic: alles im eigenen Vektorstil.
- Untertitel bleiben oberhalb der TikTok-Bedienleiste (y ≈ 1430). Rechts 150 px frei lassen.
