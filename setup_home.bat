@echo off
echo === Setup (ohne VPN/Proxy) wird ausgefuehrt ===
pip install -r requirements.txt
echo === Datenbank-Migrationen werden angewendet ===
set FLASK_APP=backend/run.py
flask db upgrade
echo === Setup abgeschlossen ===
pause
