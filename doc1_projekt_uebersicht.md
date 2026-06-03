# Tätigkeitserhebung Tool – Dokument 1
## Projektübersicht, Stack, Struktur & Deployment

> **Hinweis für Cursor:** Dieses Dokument immer als Basis-Kontext mitgeben. Für jeden Bauabschnitt zusätzlich das entsprechende Dokument (2–5) hinzufügen.

---

## 1. Projektziel

Web-Applikation zur Erhebung von Tätigkeitsprofilen im Rahmen einer arbeitsplatzbasierten Umgestaltung (Activity-Based Working). Teilnehmer erfassen täglich ihre Zeitblöcke nach Tätigkeitskategorie. Admins werten die Daten aus und leiten daraus den Raumbedarf für neue Arbeitswelten ab.

- Max. 100 Teilnehmer
- Erhebungszeitraum begrenzt (definiert pro Gruppe)
- Server läuft lokal auf einem dedizierten Windows-Laptop im internen Netzwerk
- Alle anderen Teilnehmer greifen per Browser über das lokale Netzwerk zu (kein Internet nötig)

---

## 2. Tech Stack

### Backend

| Technologie | Entscheid |
|---|---|
| Sprache | Python 3.x |
| Framework | Flask mit Blueprints |
| ORM | SQLAlchemy |
| Datenbank | SQLite (lokale Datei) |
| Auth | PIN-basiert, gehasht mit bcrypt |
| Konfiguration | .env via python-dotenv |

### Frontend

| Technologie | Entscheid |
|---|---|
| Framework | React (Vite) |
| Styling | Tailwind CSS |
| Kalender-Komponente | react-big-calendar oder FullCalendar |
| HTTP-Client | fetch API |
| State Management | React useState / useContext (kein Redux) |
| Build | Lokal beim Entwickler, `dist/` wird eingecheckt |

### Deployment

| Aspekt | Lösung |
|---|---|
| Server | Dedizierter Windows-Laptop, läuft während Erhebung |
| Python | Bereits installiert via IT-Softwarecenter |
| Node/npm | Nur beim Entwickler (privater Laptop), nicht auf Server nötig |
| pip install | Mit Zscaler-Proxy-Flag (siehe setup.bat) |
| React Build | Entwickler baut lokal, `dist/` in `backend/static/` eingecheckt und im Repo |
| Projektablage | Gesamtes Projekt liegt auf einem Netzwerkordner (inkl. DB und .env) |
| venv | Liegt auf dem Netzwerkordner, wird lokal vom Server-Laptop ausgeführt |
| Erreichbarkeit | `http://localhost:5000` (Server-Laptop), `http://192.168.x.x:5000` (Netzwerk / VPN) |
| Datenbankdatei | Im Projektordner auf dem Netzwerkordner (`backend/data/taetigkeitserhebung.db`) |

---

## 3. Projektstruktur

```
project/
  backend/
    app/
      __init__.py              # Flask App Factory
      auth/
        __init__.py
        routes.py              # Login, Logout, PIN-Reset
      admin/
        __init__.py
        routes.py              # Gruppen, Teilnehmer, Kategorien, Raumtypen
      teilnehmer/
        __init__.py
        routes.py              # Eintraege, Submit, Dashboard
      auswertung/
        __init__.py
        routes.py              # Auswertungs-API fuer Admin
    models/
      __init__.py
      user.py
      gruppe.py
      kategorie.py
      raumtyp.py
      eintrag.py
      einreichung.py
    services/
      __init__.py
      auth_service.py          # PIN-Logik, Session-Handling
      auswertung_service.py    # Berechnungslogik Raumplanung
    static/                    # React Build Output (eingecheckt)
    templates/
      index.html               # Entry Point fuer React SPA
    config.py                  # Konfigurationsklassen
    extensions.py              # db, bcrypt Initialisierung
    run.py                     # Flask Entry Point
  frontend/
    src/
      components/              # Wiederverwendbare UI-Komponenten
      pages/                   # Seitenkomponenten
      api/                     # API-Client-Funktionen
      context/                 # React Context (Auth etc.)
      App.jsx
      main.jsx
    dist/                      # Build Output -> wird nach backend/static/ kopiert
    package.json
    tailwind.config.js
    vite.config.js
  .env                         # Secrets (nicht einchecken)
  .env.example                 # Vorlage fuer .env
  .gitignore
  requirements.txt
  setup.bat                    # Einmalige Installation
  START_SERVER.bat             # Server starten (nur auf dem dedizierten Server-Laptop ausfuehren!)
  START_SERVER.bat             # Server starten (NUR auf Server-Laptop ausfuehren)
  setup.bat                    # Einmalige Installation
  build.bat                    # React bauen + nach backend/static/ kopieren (nur Entwickler)
  backup.bat                   # DB-Backup erstellen
  README.md
  backup/                      # DB-Backups (in .gitignore)
```

---

## 4. Batch-Skripte (Windows)

### setup.bat – einmalig ausführen

Erstellt Virtual Environment und installiert Python-Dependencies mit Zscaler-Proxy:

```bat
@echo off
echo === Setup wird ausgefuehrt ===
python -m venv venv
call venv\Scripts\activate.bat
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org ^
  --proxy http://gateway.swisscom.zscloud.net:9400 -r requirements.txt
echo === Setup abgeschlossen ===
pause
```

### START_SERVER.bat – täglich zum Starten (nur Server-Laptop)

Aktiviert venv, startet Flask, zeigt Netzwerk-IP an, öffnet Browser:

```bat
@echo off
echo === Server wird gestartet ===
call venv\Scripts\activate.bat
echo Netzwerk-IP:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do echo   http:%%a:5000
echo Lokaler Zugriff: http://localhost:5000
start http://localhost:5000
python backend\run.py
```

> **Wichtig:** Diese Datei darf nur auf dem dedizierten Server-Laptop ausgeführt werden. Wenn zwei Instanzen gleichzeitig laufen, kann es zu Datenbankfehlern kommen.

### build.bat – nach Frontend-Änderungen

Baut React und kopiert Output nach backend/static/:

```bat
@echo off
cd frontend
call npm run build
cd ..
xcopy /E /Y frontend\dist\* backend\static\
echo === Build abgeschlossen ===
```

---

## 5. Deployment-Workflow

### Entwicklung & Änderungen (privater Laptop)

```
1. Änderungen entwickeln
2. Bei Frontend-Änderungen: build.bat ausführen
3. git add . && git commit -m "..." && git push
```

### Erstmaliges Setup auf dem Server-Laptop

```
1. git clone <repo-url> auf den Netzwerkordner
2. .env Datei im Projektordner anlegen (Vorlage: .env.example)
3. setup.bat einmalig ausführen (legt venv an, installiert Dependencies)
4. START_SERVER.bat ausführen -> Browser öffnet sich automatisch
5. /setup aufrufen -> ersten Admin-Account anlegen
```

### Updates einspielen (bei laufender Erhebung)

```
1. Server stoppen (Konsolenfenster schliessen)
2. git pull im Projektordner auf dem Netzwerkordner
3. Bei neuen Python-Dependencies: setup.bat erneut ausführen
4. START_SERVER.bat ausführen
```

### Änderungen am Datenbankschema

- Flask-Migrate wird als Dependency eingerichtet (`flask-migrate`)
- Schema-Änderungen via Migrations: `flask db migrate` + `flask db upgrade`
- Migrations-Dateien werden ins Repo eingecheckt
- Beim Update: `flask db upgrade` läuft automatisch beim App-Start
- Cursor-Hinweis: keine manuellen Schema-Änderungen an der DB, immer via Migrations

### Backup der Datenbank

`backup.bat` kopiert die aktuelle DB-Datei mit Timestamp in einen Backup-Ordner auf dem Netzwerkordner:

```bat
@echo off
set DATUM=%date:~6,4%-%date:~3,2%-%date:~0,2%
copy backend\data\taetigkeitserhebung.db backup\taetigkeitserhebung_%DATUM%.db
echo === Backup erstellt: taetigkeitserhebung_%DATUM%.db ===
```

Empfehlung: Backup täglich manuell ausführen oder via Windows Task Scheduler automatisieren.

---

## 6. Datenmodell

Alle Modelle verwenden SQLAlchemy ORM. Primärschlüssel sind Integer (auto-increment). Timestamps als `created_at` / `updated_at` wo sinnvoll.

### User

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| email | String, unique, not null | Eindeutige E-Mail-Adresse |
| pin_hash | String, not null | bcrypt-Hash des PIN |
| rolle | Enum: ADMIN / TEILNEHMER | Benutzerrolle |
| aktiv | Boolean, default True | Soft-Deaktivierung |
| created_at | DateTime | Erstellungszeitpunkt |

### Gruppe

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| name | String, not null | Gruppenname / Standortbezeichnung |
| zeitraum_von | Date, not null | Beginn Erhebungszeitraum |
| zeitraum_bis | Date, not null | Ende Erhebungszeitraum |
| sharing_ratio | Float, default 1.2 | Desk-Sharing-Ratio |
| registrierung_link_token | String, unique | Token für Self-Registration-Link |
| created_at | DateTime | Erstellungszeitpunkt |

### GruppenMitglied (Many-to-Many)

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| user_id | Integer FK -> User | Teilnehmer |
| gruppe_id | Integer FK -> Gruppe | Gruppe |
| joined_at | DateTime | Eintrittszeitpunkt |

Unique Constraint auf `(user_id, gruppe_id)`. Eine Person kann in mehreren aktiven Gruppen sein.

### Raumtyp

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| name | String, not null | Bezeichnung (z.B. Telefonbox) |
| beschreibung | Text | Detailbeschreibung |
| aktiv | Boolean, default True | Soft-Delete |
| sort_order | Integer | Anzeigereihenfolge |

### Kategorie

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| name | String, not null | Bezeichnung |
| beschreibung | Text | Detailbeschreibung für Infobox |
| farbe | String (Hex) | Farbcode z.B. #4472C4 |
| raumtyp_id | Integer FK -> Raumtyp, nullable | Zugeordneter Raumtyp (1:1) |
| aktiv | Boolean, default True | Soft-Delete |
| sort_order | Integer | Anzeigereihenfolge |

Soft-Delete-Regel: Deaktivieren statt Löschen wenn Einträge vorhanden. Bei Änderung: Admin wählt ob neue Kategorie erstellt oder bestehende überschrieben wird.

### Eintrag

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| user_id | Integer FK -> User | Erfassender Teilnehmer |
| gruppe_id | Integer FK -> Gruppe | Zugehörige Gruppe |
| kategorie_id | Integer FK -> Kategorie | Tätigkeitskategorie |
| datum | Date, not null | Tag des Eintrags (Mo–Fr) |
| zeit_von | Time, not null | Startzeit (15-Min-Raster) |
| zeit_bis | Time, not null | Endzeit (15-Min-Raster) |
| created_at | DateTime | Erstellungszeitpunkt |
| updated_at | DateTime | Letzte Änderung |

Constraint: Keine überlappenden Einträge pro `(user_id, gruppe_id, datum)`. Validierung im Service-Layer.

### Einreichung

| Feld | Typ | Beschreibung |
|---|---|---|
| id | Integer PK | Auto-increment |
| user_id | Integer FK -> User | Teilnehmer |
| gruppe_id | Integer FK -> Gruppe | Gruppe |
| status | Enum (s.u.) | Aktueller Status |
| eingereicht_am | DateTime, nullable | Zeitpunkt der Einreichung |
| updated_at | DateTime | Letzte Statusänderung |

**Status-Enum:** `OFFEN` | `EINGEREICHT` | `IN_BEARBEITUNG` | `ABGESCHLOSSEN`

Unique Constraint auf `(user_id, gruppe_id)`. Wird beim ersten Eintrag eines Teilnehmers automatisch angelegt.

**Zustandsübergänge:**
- `OFFEN` → `EINGEREICHT` (Teilnehmer)
- `EINGEREICHT` → `IN_BEARBEITUNG` (Teilnehmer selbst oder Admin)
- `IN_BEARBEITUNG` → `ABGESCHLOSSEN` (Teilnehmer oder Admin)

---

## 7. Rollen & Authentifizierung

### Rollen

| Rolle | Beschreibung |
|---|---|
| ADMIN | Verwaltet Gruppen, Teilnehmer, Kategorien, Raumtypen; sieht Auswertungen |
| TEILNEHMER | Erfasst eigene Einträge, kann einreichen und entsperren |

### PIN-Authentifizierung

- Teilnehmer registrieren sich selbst über einen gruppenspezifischen Link
- Registrierung: E-Mail-Adresse + PIN wählen
- Hinweis bei PIN-Wahl: *"Wähle einen einfachen PIN, den du dir merken kannst. Der Admin kann deinen PIN zurücksetzen, aber nicht einsehen."*
- PIN wird mit bcrypt gehasht gespeichert – Admin sieht nie den Klartext
- Admin kann PIN eines Teilnehmers zurücksetzen (temporärer PIN wird gesetzt)
- Session-basierte Authentifizierung nach Login
- Admin-Accounts werden manuell angelegt (kein Self-Registration für Admins)

---

## 8. Coding Standards

### Python / Flask

- PEP8 durchgehend einhalten
- Flask App Factory Pattern in `app/__init__.py`
- Blueprints für jeden Funktionsbereich (`auth`, `admin`, `teilnehmer`, `auswertung`)
- SQLAlchemy ORM, kein rohes SQL
- Geschäftslogik in `services/`, nicht in `routes.py`
- Alle Funktionen mit Docstrings dokumentieren
- Keine Magic Numbers – Konstanten in `config.py` oder als Enum
- Fehlerbehandlung konsequent mit try/except, keine nackten Exceptions
- HTTP-Statuscodes korrekt verwenden (200, 201, 400, 401, 403, 404, 409, 500)
- API gibt immer JSON zurück: `{ "data": ..., "error": ... }`
- Secrets ausschliesslich via `.env` / python-dotenv, nie hardcoded

### React / Frontend

- Funktionale Komponenten mit Hooks (kein class-based)
- Komponenten in `components/` klein und wiederverwendbar halten
- Seiten in `pages/` als Zusammensetzung von Komponenten
- API-Aufrufe ausschliesslich in `api/`-Funktionen, nie direkt in Komponenten
- Fehlerbehandlung bei allen API-Aufrufen (loading / error / success states)
- Tailwind utility classes, kein eigenes CSS ausser für dynamische Werte (z.B. Kategoriefarben)
- Keine Inline-Styles ausser für dynamische Werte

### Allgemein

- Sprache im Code: Englisch (Variablen, Funktionen, Kommentare)
- Sprache in der UI: Deutsch
- `.gitignore`: `venv/`, `__pycache__/`, `.env`, `*.db`, `node_modules/`, `frontend/dist/` — **Achtung:** `backend/static/` wird eingecheckt (React Build), nicht ignorieren
- `.env.example` mit allen benötigten Keys (ohne Werte) einchecken
- `README.md` mit Installations- und Startanleitung auf Deutsch

---

## 9. Konfiguration (.env.example)

```
SECRET_KEY=dein-geheimer-schluessel
DATABASE_URL=sqlite:///backend/data/taetigkeitserhebung.db
FLASK_ENV=production
FLASK_DEBUG=0
```

---

## 10. Auswertungs-Export

Am Ende der Erhebung kann die Auswertung als **statische HTML-Datei** exportiert werden. Diese Datei:

- Enthält alle Auswertungsdaten eingebettet (kein Server nötig zum Öffnen)
- Ist filterbar (nach Gruppe, Zeitraum, Raumtyp)
- Kann im Browser geöffnet, ausgedruckt oder weitergegeben werden
- Wird von Flask generiert und als Download angeboten

Der Export-Button ist auf der Auswertungsseite des Admins verfügbar. Die generierte Datei ist vollständig selbstständig – nach Abschluss des Projekts ist kein laufender Server mehr nötig.

---

## 11. Dokumentation (wird nach Projektabschluss erstellt)

| Dokument | Zielgruppe | Inhalt |
|---|---|---|
| `README.md` | Alle | Installation, Setup, Start |
| `TECHNIK.md` | Entwickler | Architektur, API-Endpunkte, Datenmodell, Entwicklungsworkflow |
| `ADMIN_HANDBUCH.md` | Admins (nicht-technisch) | Schritt-für-Schritt: Gruppe anlegen, Teilnehmer verwalten, Auswertung lesen, Export |

Die technische Doku und das Admin-Handbuch werden erst nach Fertigstellung der App erstellt, damit sie nicht veralten.

---

## 12. Kontext-Übersicht für Cursor

| Bauabschnitt | Dokumente |
|---|---|
| Projekt-Setup, Grundstruktur | Dok. 1 |
| Datenbank anlegen, Seed-Daten | Dok. 1 + 2 |
| Admin-Funktionen bauen | Dok. 1 + 3 |
| Teilnehmer-Funktionen bauen | Dok. 1 + 4 |
| Auswertung + Export bauen | Dok. 1 + 5 |

---

## 13. Offene Entscheide & Randfall-Definitionen

### Admin-Bootstrap (erster Start)

Beim allerersten Start der Applikation (keine User in der Datenbank) leitet Flask automatisch auf eine Setup-Seite weiter:

- URL: `/setup`
- Felder: E-Mail-Adresse + PIN + PIN bestätigen
- Nach dem Anlegen des ersten Admin-Accounts: Weiterleitung zum Admin-Login
- Die `/setup`-Route ist danach permanent deaktiviert (sobald mindestens ein Admin existiert, gibt sie 404 zurück)

### Zeitzone

- Der Server läuft in der Schweiz (Europe/Zurich)
- SQLite speichert alle Zeiten als lokale Zeit, keine UTC-Konvertierung
- Flask und SQLAlchemy werden explizit ohne UTC-Handling konfiguriert
- `datetime.now()` wird durchgehend verwendet, nie `datetime.utcnow()`
- Cursor-Hinweis: keine Timezone-aware datetimes verwenden, konsistent naive datetimes in Lokalzeit

### Session-Timeout

- Session läuft ab nach 8 Stunden Inaktivität
- Oder beim Schliessen des Browsers (Session-Cookie, kein Persistent Cookie)
- Nach Ablauf: Weiterleitung zur Login-Seite mit Hinweis *"Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."*
- Flask-Konfiguration: `PERMANENT_SESSION_LIFETIME = timedelta(hours=8)`, `SESSION_PERMANENT = False`

### Logout

- Nach dem Logout: Weiterleitung zur Login-Seite

### Erhebungszeitraum – Erfassungsregeln

- Teilnehmer können Einträge für Tage innerhalb des Erhebungszeitraums erfassen, solange die Gruppe aktiv ist
- Tage ausserhalb des Erhebungszeitraums (vor `zeitraum_von` oder nach `zeitraum_bis`) sind nicht erfassbar – entsprechende Tage in der Kalenderansicht sind ausgegraut und nicht klickbar
- Nach Ablauf des Erhebungszeitraums können Teilnehmer weiterhin nacherfassen und einreichen, solange die Gruppe nicht deaktiviert wurde
- Erst wenn der Admin die Gruppe deaktiviert, ist keine Erfassung mehr möglich

### Browserkompatibilität

- Zielplattform: Chrome und Edge (aktuell, Kanton Zürich Standard)
- Kein expliziter Support für Firefox, Safari oder mobile Browser nötig
- Responsive Design ist kein Ziel – die App ist für Desktop-Nutzung optimiert
