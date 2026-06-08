@echo off
echo === Server wird gestartet ===
echo.
echo Zugriff fuer Teilnehmer (empfohlen):
for /f %%a in ('hostname') do echo   http://%%a:5000
echo.
echo Zugriff via IP (Fallback):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do echo   http:%%a:5000
echo.
echo Lokaler Zugriff: http://localhost:5000
echo.
start http://localhost:5000
python backend\run.py
echo.
echo === Server beendet (Exit-Code: %ERRORLEVEL%) ===
pause