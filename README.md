# Tätigkeitserhebung Tool

Web-Applikation zur Erhebung von Tätigkeitsprofilen im Rahmen einer arbeitsplatzbasierten Umgestaltung (Activity-Based Working). Teilnehmer erfassen täglich ihre Zeitblöcke nach Tätigkeitskategorie. Admins werten die Daten aus und leiten daraus den Raumbedarf für neue Arbeitswelten ab.

- Max. 100 Teilnehmer
- Läuft lokal auf einem dedizierten Windows-Laptop im internen Netzwerk (kein Internet nötig)
- Backend: Python / Flask / SQLAlchemy / SQLite
- Frontend: React (Vite) / Tailwind CSS

---

## Voraussetzungen

- Python 3.x (auf dem Server-Laptop bereits via IT-Softwarecenter installiert)
- Node.js / npm (nur auf dem Entwickler-Laptop für den Frontend-Build nötig)

---

## Erstmaliges Setup auf dem Server-Laptop

1. Repository in den Netzwerkordner klonen:
   ```
   git clone <repo-url>
   ```
2. `.env` Datei im Projektordner anlegen (Vorlage: `.env.example`).
3. `setup.bat` einmalig ausführen – legt das Virtual Environment an, installiert die Dependencies und wendet die Datenbank-Migrationen an.
4. `START_SERVER.bat` ausführen – der Browser öffnet sich automatisch.
5. Beim ersten Start auf `/setup` den ersten Admin-Account anlegen.

> **Wichtig:** `START_SERVER.bat` darf nur auf dem dedizierten Server-Laptop ausgeführt werden. Laufen zwei Instanzen gleichzeitig, kann es zu Datenbankfehlern kommen.

---

## Zugriff

- Server-Laptop: `http://localhost:5000`
- Andere im Netzwerk / via VPN: `http://192.168.x.x:5000` (IP wird beim Start angezeigt)

---

## Entwicklung (privater Laptop)

Backend:
```
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python backend\run.py
```

Frontend:
```
cd frontend
npm install
npm run dev
```

Nach Frontend-Änderungen den produktiven Build erzeugen und nach `backend/static/` kopieren:
```
build.bat
```

---

## Updates einspielen (bei laufender Erhebung)

1. Server stoppen (Konsolenfenster schliessen).
2. `git pull` im Projektordner.
3. Bei neuen Python-Dependencies: `setup.bat` erneut ausführen.
4. `START_SERVER.bat` ausführen.

Datenbankänderungen werden ausschliesslich über Flask-Migrate verwaltet (`flask db migrate` / `flask db upgrade`). `flask db upgrade` läuft beim Setup automatisch.

---

## Backup

`backup.bat` kopiert die aktuelle Datenbankdatei mit Zeitstempel in den Ordner `backup/`. Empfehlung: täglich ausführen oder via Windows Task Scheduler automatisieren.
