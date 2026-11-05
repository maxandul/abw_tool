@echo off
setlocal
rem Unbeaufsichtigter Produktivstart fuer die Windows-Aufgabenplanung.
cd /d "%~dp0"
if errorlevel 1 exit /b 1

if not exist "logs" mkdir "logs"
if not exist "logs" exit /b 1

set "APP_MODE=production"
set "FLASK_ENV=production"
set "FLASK_DEBUG=0"
set "PYTHONUNBUFFERED=1"

if not exist "venv\Scripts\python.exe" (
    echo [%DATE% %TIME%] FEHLER: venv\Scripts\python.exe fehlt. setup.bat zuerst ausfuehren.>>"logs\production.log"
    exit /b 1
)

echo [%DATE% %TIME%] Produktivserver startet.>>"logs\production.log"
"venv\Scripts\python.exe" "backend\run.py" >>"logs\production.log" 2>&1
set "SERVER_EXIT_CODE=%ERRORLEVEL%"
echo [%DATE% %TIME%] Server beendet, Exit-Code: %SERVER_EXIT_CODE%.>>"logs\production.log"
exit /b %SERVER_EXIT_CODE%
