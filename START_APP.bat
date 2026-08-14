@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Taetigkeitserhebung starten
echo ==============================================
echo.
echo [1] Produktivmodus (lokale DB, Schreibzugriff)
echo [2] Read-only-Modus (neustes Netzwerk-Backup)
echo [Q] Abbrechen
echo.

choice /C 12Q /N /M "Auswahl: "
if errorlevel 3 exit /b 0
if errorlevel 2 goto readonly

:production
set APP_MODE=production
echo.
echo Starte Produktivmodus ...
goto start

:readonly
set APP_MODE=readonly
echo.
echo Kopiere neustes Backup lokal und starte Read-only-Modus ...

:start
start "" http://localhost:5000
python backend\run.py
echo.
echo === Server beendet (Exit-Code: %ERRORLEVEL%) ===
pause
endlocal
