@echo off
cd frontend
call npm run build
cd ..
xcopy /E /Y frontend\dist\* backend\static\
echo === Build abgeschlossen ===
