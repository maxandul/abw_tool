# Tätigkeitserhebung Tool

Web-Applikation zur Erhebung von Tätigkeitsprofilen im Rahmen einer arbeitsplatzbasierten Umgestaltung (Activity-Based Working). Teilnehmer erfassen täglich ihre Zeitblöcke nach Tätigkeitskategorie. Admins werten die Daten aus und leiten daraus den Raumbedarf für neue Arbeitswelten ab.

- Läuft lokal auf einem dedizierten Windows-Laptop im internen Netzwerk
- Backend: Python / Flask / SQLAlchemy / SQLite
- Frontend: React (Vite) / Tailwind CSS

---

## Funktionsumfang

**Teilnehmer**
- Erfassen ihre Arbeitszeit in einem Wochenkalender, blockweise pro Tätigkeitskategorie.
- Reichen die Erhebung am Ende ein; eingereichte Erhebungen sind gesperrt (Entsperren auf Wunsch möglich).

**Admin**
- Verwaltet Tätigkeitskategorien (gruppiert nach Tätigkeitsgruppe) und Erhebungen inkl. Teilnehmer.
- Dashboard mit Fortschritt pro Erhebung. Die erwarteten Stunden werden nach **Beschäftigungsgrad** gewichtet (Summe der Pensen × Arbeitstage × 8,4 h), Teilzeit zählt anteilig.
- Kann einzelne Teilnehmer-Erhebungen einsehen und im selben Kalender direkt bearbeiten (Admin-Override, unabhängig vom Einreichungsstatus).
- **Auswertung** über eine oder mehrere Erhebungen, mit Filtern nach Teilnehmer-Attributen (Funktion, Organisationseinheit, Beschäftigungsgrad), Wochentagen und Tätigkeiten:
  - *Stichprobe*: Datenbasis (eingereicht/offen, FTE-Summe, erfasste vs. erwartete Stunden, Vollständigkeit; Hinweis auf Teilnehmer unter 85 %).
  - *Lastprofil*: Heatmap über die Woche (Mittelwert/Maximum) für gewählte Tätigkeiten.
  - *Bedarf nach Tätigkeit* und *Anteilsübersicht* (nach Tätigkeit und Tätigkeitsgruppe).
  - In die Auswertung fliessen nur **eingereichte** Teilnehmer ein.
- **HTML-Export**: eigenständige, anonyme Datei (keine Namen/E-Mail-Adressen) der gewählten Erhebung(en). Sie ist interaktiv – Empfänger können darin selbst nach Attributen filtern und Lastprofile erstellen, ganz ohne Server.

---

## Voraussetzungen

- **Python 3.11+** (auf dem Server-Laptop via IT-Softwarecenter installieren)
- Node.js / npm (nur auf dem Entwickler-Laptop für den Frontend-Build nötig)

---

## Erstmaliges Setup auf dem Server-Laptop

### 1. Repository klonen

```
git clone <repo-url>
cd abw_tool
```

### 2. `.env`-Datei anlegen

```
copy .env.example .env
```

Die Datei mit einem Texteditor öffnen und `SECRET_KEY` auf eine zufällige Zeichenkette setzen
(z. B. `meinGeheimesPasswort2026!`). Diese Zeichenkette sichert die Login-Sessions.
Ohne `.env`-Datei läuft die Applikation trotzdem, verwendet aber einen unsicheren Standard-Key.

```
SECRET_KEY=hierIhrGeheimesPasswort
DATABASE_URL=sqlite:///backend/data/taetigkeitserhebung.db
FLASK_ENV=production
FLASK_DEBUG=0
```

> **Hinweis:** Die Datenbank-Datei wird beim ersten Start automatisch unter `backend/data/` angelegt. Es ist kein manuelles Vorbereiten nötig.

### 3. `setup.bat` ausführen

Legt das Python-Virtual-Environment an, installiert alle Dependencies und wendet die Datenbank-Migrationen an.

```
setup.bat
```

> Das Script setzt den Swisscom-Proxy (`gateway.swisscom.zscloud.net:9400`). Falls pip trotzdem keine Pakete laden kann, VPN-Verbindung prüfen.

### 4. `START_SERVER.bat` ausführen

Der Browser öffnet sich automatisch auf `http://localhost:5000`.

```
START_SERVER.bat
```

### 5. Ersten Admin-Account anlegen

Beim allerersten Start erscheint die Seite `/setup`. Dort den Admin-Account einrichten.

> **Wichtig:** `START_SERVER.bat` darf nur auf dem **einen** dedizierten Server-Laptop laufen. Zwei gleichzeitige Instanzen können die Datenbank beschädigen.

---

## Zugriff

| Gerät | URL |
|---|---|
| Server-Laptop | `http://localhost:5000` |
| Andere Geräte im Netzwerk / VPN | `http://<IP-des-Laptops>:5000` |

Die aktuelle IP-Adresse des Server-Laptops wird beim Start von `START_SERVER.bat` in der Konsole angezeigt.

---

## Updates einspielen (bei laufender Erhebung)

1. Server stoppen (Konsolenfenster schliessen).
2. `git pull` im Projektordner ausführen.
3. Bei neuen Python-Paketen: `setup.bat` erneut ausführen.
4. `START_SERVER.bat` ausführen.

Datenbankmigrationen laufen beim Start automatisch (`flask db upgrade` in `run.py`).

---

## Entwicklung (privater Entwickler-Laptop)

**Backend:**
```
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python backend\run.py
```

**Frontend (Dev-Server mit Hot-Reload):**
```
cd frontend
npm install
npm run dev
```

**Nach Frontend-Änderungen – produktiven Build erzeugen:**
```
build.bat
```
Kopiert `frontend/dist/` nach `backend/static/`.

---

## Backup

`backup.bat` kopiert die aktuelle Datenbankdatei mit Zeitstempel in den Ordner `backup/`.
Empfehlung: täglich ausführen oder via Windows Task Scheduler automatisieren.
