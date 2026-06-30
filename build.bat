@echo off
cd frontend
call npm install
call npm run build
cd ..
rem Alte Build-Artefakte entfernen, damit sich keine veralteten Hash-Dateien ansammeln
if exist backend\static\assets rmdir /S /Q backend\static\assets
xcopy /E /Y frontend\dist\* backend\static\
echo === Build abgeschlossen ===
