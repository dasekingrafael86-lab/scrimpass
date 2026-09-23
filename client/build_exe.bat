@echo off
rem Baut ScrimPassClient.exe (unsichtbar, ohne Fenster). Auf einem Windows-PC mit
rem installiertem Python ausfuehren: einfach doppelklicken.
cd /d "%~dp0"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --onefile --noconsole --name ScrimPassClient scrimpass_client.py
echo.
echo Fertig: dist\ScrimPassClient.exe
echo Diese Datei auf den ScrimPass-Server nach client\dist\ kopieren, damit sie auf der SP-Client-Seite zum Download angeboten wird.
pause
