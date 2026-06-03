@echo off
echo === Server wird gestartet ===
call venv\Scripts\activate.bat
echo Netzwerk-IP:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do echo   http:%%a:5000
echo Lokaler Zugriff: http://localhost:5000
start http://localhost:5000
python backend\run.py
