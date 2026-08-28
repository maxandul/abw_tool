@echo off
setlocal
cd /d "%~dp0"

echo === Frontend wird gebaut ===
cd frontend

call npm install
if errorlevel 1 (
  echo.
  echo FEHLER: npm install ist fehlgeschlagen ^(siehe Meldungen oben^).
  echo Build abgebrochen - der bisherige Stand in backend\static bleibt unveraendert.
  cd ..
  pause
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo.
  echo FEHLER: npm run build ist fehlgeschlagen ^(siehe Meldungen oben^).
  echo Build abgebrochen - der bisherige Stand in backend\static bleibt unveraendert.
  cd ..
  pause
  exit /b 1
)

cd ..

if not exist frontend\dist\index.html (
  echo.
  echo FEHLER: frontend\dist\index.html wurde nicht gefunden - der Build hat offenbar
  echo kein Ergebnis erzeugt. Build abgebrochen - der bisherige Stand in backend\static
  echo bleibt unveraendert.
  pause
  exit /b 1
)

echo === Alte Build-Artefakte werden entfernt ===
rem Alte Build-Artefakte entfernen, damit sich keine veralteten Hash-Dateien ansammeln.
rem Falls der Server noch laeuft, kann das fehlschlagen (Dateien gesperrt) - dann
rem unbedingt zuerst den Server stoppen und build.bat erneut ausfuehren.
if exist backend\static\assets (
  rmdir /S /Q backend\static\assets
  if exist backend\static\assets (
    echo.
    echo FEHLER: backend\static\assets konnte nicht entfernt werden ^(vermutlich durch
    echo den laufenden Server gesperrt^). Bitte zuerst den Server ^(START_APP.bat-Fenster^)
    echo schliessen und build.bat erneut ausfuehren. Build abgebrochen - der bisherige
    echo Stand in backend\static bleibt unveraendert.
    pause
    exit /b 1
  )
)

echo === Neuer Build wird nach backend\static kopiert ===
xcopy /E /Y frontend\dist\* backend\static\
if errorlevel 1 (
  echo.
  echo FEHLER: Kopieren nach backend\static ist fehlgeschlagen.
  pause
  exit /b 1
)

echo.
echo === Build abgeschlossen ===
echo Ausgelieferte Datei: backend\static\index.html
for %%F in (backend\static\assets\index-*.js) do echo Neues JS-Bundle: %%~nxF
pause
