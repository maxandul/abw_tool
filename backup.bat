@echo off
set DATUM=%date:~6,4%-%date:~3,2%-%date:~0,2%
if not exist backup mkdir backup
copy backend\data\taetigkeitserhebung.db backup\taetigkeitserhebung_%DATUM%.db
echo === Backup erstellt: taetigkeitserhebung_%DATUM%.db ===
