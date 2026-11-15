"""Einstellungen für den Produktionsserver. `gunicorn app:app` liest diese Datei
automatisch (sie liegt im Startverzeichnis) -- am Startbefehl bei Render muss
nichts geändert werden.

Warum: Mit der Voreinstellung (ein Prozess, eine Anfrage nach der anderen,
30 Sekunden Zeitlimit) blockiert ein einziger langsamer Replay-Upload die ganze
Seite für alle anderen, und Uploads über 30 Sekunden werden abgebrochen. Nach
einem Match laden aber viele Clients gleichzeitig hoch.
"""

# Genau EIN Prozess: Schreibsperre und Replay-Warteschlange in app.py leben im
# Prozess. Mehr Prozesse nur zusammen mit einer anderen Lösung dafür.
workers = 1
# ... der aber viele Anfragen gleichzeitig bedient (Uploads, Seitenaufrufe, Abfragen).
worker_class = "gthread"
threads = 32
# Große Replays über langsame Leitungen brauchen Zeit.
timeout = 180
graceful_timeout = 30
keepalive = 5
