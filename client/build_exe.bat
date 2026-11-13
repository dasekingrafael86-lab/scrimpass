@echo off
rem Baut ScrimPassClient.exe (kein Konsolenfenster, laeuft als Tray-Symbol).
rem Auf einem Windows-PC mit installiertem Python ausfuehren: einfach doppelklicken.
rem Ohne Tastendruck am Ende (z. B. aus einem Skript):  build_exe.bat nopause
cd /d "%~dp0"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt pyinstaller
rem Versionsnummer aus scrimpass_client.py in die .exe-Metadaten uebernehmen.
python write_version.py --prepare
python -m PyInstaller --onefile --noconsole --hidden-import=pystray._win32 --icon=icon.ico --version-file=version_info.txt --name ScrimPassClient scrimpass_client.py
if errorlevel 1 (
  echo.
  echo FEHLER: Der Build ist fehlgeschlagen - dist\ScrimPassClient.exe wurde NICHT erneuert.
  if /i not "%1"=="nopause" pause
  exit /b 1
)
rem Version der gebauten .exe nach dist\version.txt schreiben -- ScrimPass liest sie von dort.
python write_version.py
if errorlevel 1 (
  echo.
  echo FEHLER: dist\version.txt konnte nicht geschrieben werden.
  if /i not "%1"=="nopause" pause
  exit /b 1
)
echo.
echo Fertig: dist\ScrimPassClient.exe und dist\version.txt
echo Beide Dateien committen und pushen, damit die neue Version auf der SP-Client-Seite angeboten wird.
if /i not "%1"=="nopause" pause
