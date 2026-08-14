@echo off
cd /d "%~dp0"
set APP_MODE=production
python backend\backup_cli.py
pause
