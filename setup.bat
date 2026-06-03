@echo off
echo === Setup wird ausgefuehrt ===
python -m venv venv
call venv\Scripts\activate.bat
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org ^
  --proxy http://gateway.swisscom.zscloud.net:9400 -r requirements.txt
echo === Datenbank-Migrationen werden angewendet ===
set FLASK_APP=backend/run.py
flask db upgrade
echo === Setup abgeschlossen ===
pause
