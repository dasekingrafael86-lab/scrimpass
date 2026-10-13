// Texte mit eingesetzten Namen o. Ä. – Muster: [RegExp, Ersatz].
// Ersatz kann ein String ($1, $2 ...) oder eine Funktion sein; T(x) übersetzt
// einen eingesetzten Teil (z. B. einen Angebotsnamen), falls bekannt.
window.SP_I18N_EN_PATTERNS = (function () {
  var T = function (s) { return window.SP_I18N_T ? window.SP_I18N_T(s) : s; };
  return [
    // Benachrichtigungen vom Server
    [/^(.+) hat dich zu "(.+)" eingeladen\.$/, '$1 invited you to "$2".'],
    [/^Runde #(\d+) startet in (\d+) Min\.$/, 'Round #$1 starts in $2 min.'],
    [/^Dabei seit (.+)$/, function (_, d) { return 'Member since ' + T(d); }],
    [/^Rang #(\d+)$/, 'Rank #$1'],
    [/^⏳ noch (\d+) Std\.$/, '⏳ $1 hrs left'],
    [/^⏳ noch (\d+) Min\.$/, '⏳ $1 min left'],
    [/^🎯 (\d+) Snipes$/, '🎯 $1 snipes'],
    [/^Freischalten · (\d+)$/, 'Unlock · $1'],
    [/^Willkommensangebot: (\d+) Gratis-Tokens$/, 'Welcome offer: $1 free tokens'],
    [/^(\d+)\/(\d+) Freunde · Epic (✓|fehlt)$/, function (_, a, b, e) { return a + '/' + b + ' friends · Epic ' + (e === '✓' ? '✓' : 'missing'); }],
    [/^🔒 (\d+) Tokens eingefroren$/, '🔒 $1 tokens frozen'],
    [/^🎁 (\d+) Willkommens-Tokens$/, '🎁 $1 welcome tokens'],
    [/^Plan-Runden: (\d+)\/(\d+) — danach wird alles auszahlbar$/, 'Plan rounds: $1/$2 — then everything becomes withdrawable'],
    [/^(\d+) Tokens für Runden sind da – viel Erfolg!$/, '$1 tokens for rounds are here – good luck!'],
    [/^(\d+) Tokens sind jetzt auszahlbar\.$/, '$1 tokens are now withdrawable.'],
    [/^Runde beitreten — (\d+) Tokens$/, 'Join round — $1 tokens'],
    [/^(\d+) Team\(s\) nicht entfernt — für eine offene Runde angemeldet\.$/, '$1 team(s) not removed — registered for an open round.'],
    [/^(\d+) Std\. freischalten$/, 'Unlock for $1 hrs'],
    [/^(.+) für 24 Std\. freigeschaltet! 🎯$/, '$1 unlocked for 24 hrs! 🎯'],
    [/^(.+) hat "(.+)" für Runde #(\d+) angemeldet – bitte bestätigen\.$/, '$1 signed up "$2" for round #$3 – please confirm.'],
    [/^Dein (.+) ist jetzt freigeschaltet\.$/, function (_, a) { return 'Your ' + T(a) + ' is now unlocked.'; }],
    [/^(\d+) Freunde geworben – du erhältst (.+)\.$/, function (_, n, r) { return n + ' friends referred – you get ' + T(r) + '.'; }],
    [/^Deine Auszahlung über (.+) wurde überwiesen\.$/, 'Your payout of $1 has been sent.'],
    [/^🔔 (.+)$/, function (_, a) { return '🔔 ' + T(a); }],
    [/^Verbunden seit (.+?)( · Zuletzt gesehen (.+))?$/, function (_, a, __, b) { return 'Connected since ' + a + (b ? ' · Last seen ' + b : ''); }],
    [/^Jemand ist schon durchs Ziel — Ergebnisse und Tokens werden automatisch um ca\. (.+) vergeben\.$/, 'Someone has already finished — results and tokens will be awarded automatically at around $1.'],
    [/^\(noch (\d+)\)$/, '($1 more)'],
    [/^(\d+)\.–(\d+)\. Platz$/, 'Places $1–$2'],
    [/^je (\d+)$/, '$1 each'],
    [/^(\d+)\. Platz$/, function (_, n) { var v = +n % 100, s = (v >= 11 && v <= 13) ? 'th' : ({1: 'st', 2: 'nd', 3: 'rd'}[v % 10] || 'th'); return n + s + ' place'; }],
    // Euro-Beträge: "2,99€" -> "€2.99"
    [/^(\d{1,3}(?:\.\d{3})*),(\d{2}) ?€$/, function (_, a, b) { return '€' + a.replace(/\./g, ',') + '.' + b; }],
    // Server-Fehler mit Namen/Beträgen
    [/^Nicht genug Guthaben — (.+) nötig\.\s*$/, 'Not enough balance — $1 needed.'],
    [/^Nicht genug Tokens für (.+)\.$/, function (_, a) { return 'Not enough tokens for ' + T(a) + '.'; }],
    [/^Nicht genug Tokens für (.+)$/, function (_, a) { return 'Not enough tokens for ' + T(a); }],
    // Toasts
    [/^Zufällige Dropmap: (.+) freigeschaltet! 🎉$/, 'Random dropmap: $1 unlocked! 🎉'],
    [/^(.+) freigeschaltet! 🎉$/, '$1 unlocked! 🎉'],
    [/^(.+) eingelöst! 🎉$/, function (_, a) { return T(a) + ' redeemed! 🎉'; }],
    [/^Einladung an (.+) gesendet$/, 'Invite sent to $1'],
    [/^Team "(.+)" erstellt!$/, 'Team "$1" created!'],
    [/^Gekauft — (.+) ist aktiv!$/, function (_, a) { return 'Purchased — ' + T(a) + ' is active!'; }],
    [/^(.+) getrennt$/, '$1 disconnected'],
    [/^Zahlung erfolgreich — (.+) freigeschaltet!$/, function (_, a) { return 'Payment successful — ' + T(a) + ' unlocked!'; }],
    [/^(\d+) Tokens in (.+) umgetauscht!$/, '$1 tokens converted to $2!'],
    [/^“(.+)” wird hochgeladen …$/, 'Uploading "$1" …'],
    [/^⏳ „(.+)“ wird hochgeladen … (\d+) %$/, '⏳ Uploading "$1" … $2 %'],
    [/^(.+) – Runde #(\d+)$/, function (_, a, n) { return T(a) + ' – Round #' + n; }],
    [/^(.+) gegenüber Kartenzahlung$/, '$1 compared to card payment'],
    [/^(.+) bei Kartenzahlung$/, '$1 with card payment'],
    [/^(.+) — Runde (\d+)$/, '$1 — Round $2'],
    [/^aktiv — läuft ab am (.+)\.$/, 'active — expires on $1.'],
    // Angebot inkl. Dauer, z. B. "Kleines Angebot · 7 Tage"
    [/^(Schnell-Angebot|Kleines Angebot|Großes Angebot) (.+)$/, function (_, a, rest) { return T(a) + ' ' + T(rest); }],
    [/^ScrimPass Masterclass – (.+)$/, function (_, a) { return 'ScrimPass Masterclass – ' + T(a); }],
    // Allgemein: "Teil A · Teil B" – beide Teile einzeln übersetzen (zuletzt prüfen)
    [/^(.+?) · (.+)$/, function (_, a, b) { return T(a) + ' · ' + T(b); }],
  ];
})();
