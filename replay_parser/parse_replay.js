// Liest eine Fortnite-.replay-Datei und gibt eine kompakte JSON-Zusammenfassung
// auf stdout aus (Eliminierungen + eigene Platzierung). Parst bewusst NUR die
// Event-Bloecke (parsePackets: false) -- der volle Netzwerk-Paket-Stream ist
// stark versions-abhaengig und bei neueren Fortnite-Versionen nicht mehr
// zuverlaessig lesbar, die Event-Bloecke blieben in Tests aber stabil.
//
// Aufruf: node parse_replay.js <pfad-zur-replay-datei>
// Erfolg: JSON auf stdout, Exit-Code 0.
// Fehler: Fehlermeldung auf stderr, Exit-Code 1 -- der aufrufende Python-Code
// behandelt das als "konnte nicht ausgewertet werden", kein harter Fehler.

const fs = require('fs');
const parseReplay = require('fortnite-replay-parser');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Kein Dateipfad angegeben.');
    process.exit(1);
  }

  let buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (err) {
    console.error(`Datei konnte nicht gelesen werden: ${err.message}`);
    process.exit(1);
  }

  let result;
  try {
    result = await parseReplay(buffer, { parseEvents: true, parsePackets: false });
  } catch (err) {
    console.error(`Parse-Fehler: ${err.message}`);
    process.exit(1);
  }

  const teamStats = result.events.find(
    (e) => e.group === 'AthenaReplayBrowserEvents' && e.metadata === 'AthenaMatchTeamStats',
  );
  if (!teamStats || typeof teamStats.position !== 'number' || !teamStats.totalPlayers) {
    console.error('Keine AthenaMatchTeamStats im Replay gefunden -- Format evtl. nicht unterstuetzt (anderer Spielmodus?).');
    process.exit(1);
  }

  // WICHTIG: hier bewusst NICHT auf echte Epic-IDs filtern (Bots/Anzeigenamen
  // eingeschlossen lassen) -- die zeitliche Reihenfolge ALLER Eliminierungen
  // wird gebraucht, um korrekte Platzierungsnummern zu berechnen. Die Python-
  // Seite filtert erst beim Abgleich mit unseren eigenen Nutzern auf gueltige
  // Epic-IDs (siehe EPIC_ID_RE dort) -- sonst wuerde jede rausgefilterte
  // fremde Eliminierung die Zaehlung fuer alle nachfolgenden verschieben.
  const eliminations = result.events
    .filter((e) => e.group === 'playerElim' && !e.knocked)
    .map((e) => ({
      eliminated: e.eliminated,
      timeMs: e.startTime,
    }));

  process.stdout.write(JSON.stringify({
    ownPlacement: teamStats.position,
    totalPlayers: teamStats.totalPlayers,
    eliminations,
  }));
}

main();
