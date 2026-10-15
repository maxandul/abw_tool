> Aktuelle Erfassungs- und Berechnungsregeln sowie Updatehinweise: [Erfassung und Raumplanung ab Oktober 2026](#erfassung-und-raumplanung-ab-oktober-2026). Frühere frei konfigurierbare Tätigkeitskataloge gelten nur noch für historische Daten.

# Tätigkeitserhebung Tool

Web-Applikation zur Erhebung von Tätigkeitsprofilen im Rahmen einer arbeitsplatzbasierten Umgestaltung (Activity-Based Working). Teilnehmer erfassen täglich ihre Zeitblöcke nach Tätigkeitskategorie. Admins werten die Daten aus und leiten daraus den Raumbedarf für neue Arbeitswelten ab.

- Läuft lokal auf einem dedizierten Windows-Laptop im internen Netzwerk
- Backend: Python / Flask / SQLAlchemy / SQLite
- Frontend: React (Vite) / Tailwind CSS

---

## Funktionsumfang

**Teilnehmer**
- Erfassen ihre Arbeitszeit in einem Wochenkalender, blockweise pro Tätigkeit. Hat der Admin bei einer Tätigkeit Merkmale (Arbeitsort, Rückzugsbedarf, Gruppengrösse, Personenkreis, Räumlichkeit) bewusst offen gelassen, ergänzen Teilnehmende diese beim Erfassen selbst; vom Admin vorgegebene Merkmale sind nicht änderbar.
- Sehen pro Erhebung nur die dafür freigegebenen Tätigkeiten (siehe Tätigkeiten-Zuordnung unten).
- Reichen die Erhebung am Ende ein; eingereichte Erhebungen sind gesperrt (Entsperren auf Wunsch möglich).

**Admin**
- Verwaltet Tätigkeiten (gruppiert nach Arbeitsform: Einzelarbeit, Besprechung/Meeting, Abwesenheit; per Drag & Drop sortierbar). Pflicht sind nur Name, Arbeitsform und – bei Abwesenheit – der Grund; alle anderen Merkmale (bei Einzelarbeit: Arbeitsort, Rückzugsbedarf; bei Meeting: Gruppengrösse, Personenkreis, Räumlichkeit, Rückzugsbedarf) können offen gelassen werden, damit Teilnehmende sie selbst erfassen, oder fest vorgegeben werden (z. B. eine standortspezifische Tätigkeit «Beratungsgespräch» mit fest hinterlegter Gruppengrösse/Personenkreis/Räumlichkeit/Rückzugsbedarf). Rückzugsbedarf ist bei Einzelarbeit nur relevant, wenn der Arbeitsort dem üblichen Arbeitsplatz/Standort entspricht, bei Meeting nur, wenn die Räumlichkeit dem üblichen Standort entspricht – sonst entfällt er.
  Tätigkeiten aus der ersten Erhebung (vor dieser Umstrukturierung) bleiben als schreibgeschütztes Archiv erhalten und werden für neue Einträge nicht mehr angeboten.
- **Tätigkeiten-Zuordnung pro Erhebung**: Beim Anlegen/Bearbeiten einer Erhebung kann festgelegt werden, welche Tätigkeiten den Teilnehmenden zur Auswahl stehen (Standard: alle aktiven Tätigkeiten) – so muss nicht ständig standortfremde Tätigkeiten deaktiviert werden.
- Dashboard mit Fortschritt pro Erhebung. Das Soll ist für alle Teilnehmer gleich (Arbeitstage × 8,4 h): Auch Teilzeitkräfte erfassen die ganze Woche und tragen ihre regulär freie Zeit als Abwesenheit mit Grund «Teilzeit» ein. Übererfassung Einzelner wird je Teilnehmer auf 100 % begrenzt, damit Lücken anderer sichtbar bleiben.
- Kann einzelne Teilnehmer-Erhebungen einsehen und im selben Kalender direkt bearbeiten (Admin-Override, unabhängig vom Einreichungsstatus) sowie Einträge im Namen eines Teilnehmers einreichen (inkl. Lücken-Check), falls dieser das vergessen hat und nicht erreichbar ist.
- **Auswertung** über eine oder mehrere Erhebungen, mit Filtern nach Teilnehmer-Attributen (Funktion, Organisationseinheit, Beschäftigungsgrad), Wochentagen, Tätigkeiten sowie nach Arbeitsform/Arbeitsort/Gruppengrösse/Personenkreis/Räumlichkeit/Rückzugsbedarf (inkl. der von Teilnehmenden selbst ergänzten Werte):
  - *Stichprobe*: Datenbasis (eingereicht/offen, FTE-Summe, erfasste vs. erwartete Stunden, Vollständigkeit; Hinweis auf Teilnehmer unter 85 %).
  - *Lastprofil*: zwei Ansichten je Zeit-Slot. **Maximum** (Standardansicht) zeigt die volle Arbeitswoche (Mo–Fr): grösste je an einem Tag gleichzeitig beobachtete Personenzahl, über den gesamten Erhebungszeitraum gepoolt. **Mittelwert** bricht den ganzen Erhebungszeitraum (alle Wochentage, alle Wochen) auf einen einzigen, generischen Arbeitstag herunter und zeigt den Anteil der erfassten Arbeitstage, an denen der Slot gebraucht wurde (1 = jeden Tag nötig, 0,2 = im Schnitt an einem von fünf Tagen).
  - *Bedarf nach Tätigkeit* und *Anteilsübersicht* (nach Tätigkeit und Arbeitsform, je als 100%-Balken für die gesamte Zeit sowie für die Arbeitszeit ohne Abwesenheit).
  - In die Auswertung fliessen nur **eingereichte** Teilnehmer ein.
- **HTML-Export**: eigenständige, anonyme Datei (keine Namen/E-Mail-Adressen) der gewählten Erhebung(en). Sie ist interaktiv – Empfänger können darin selbst nach Attributen und Merkmalen filtern und das Lastprofil erstellen, ganz ohne Server.

---

## Voraussetzungen

- **Python 3.11+** (auf dem Server-Laptop via IT-Softwarecenter installieren)
- Node.js / npm nur für den Frontend-Build nötig – **nicht** auf dem Server-Laptop. Der Download ist im Organisationsnetz gesperrt; der Build wird deshalb auf einem privaten Laptop erzeugt und das fertige Ergebnis (`backend/static/`) direkt mit ins Repo committet (siehe unten). Der Server-Laptop braucht dafür kein Node/npm.

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
Der kompilierte Frontend-Stand (`backend/static/`) ist mit im Repo committet – ein
`git pull` bringt also auch Frontend-Änderungen mit, ohne dass auf dem Server-Laptop
`build.bat`/Node.js gebraucht wird.

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
Kopiert `frontend/dist/` nach `backend/static/` (bricht bei Fehlern in
`npm install`/`npm run build` ab, statt stillschweigend einen alten Stand
auszuliefern). Da Node.js im Organisationsnetz gesperrt ist, läuft dieser
Schritt auf einem privaten Laptop mit Internetzugang – das Ergebnis in
`backend/static/` danach committen und pushen/mit ins Repo aufnehmen, damit
der Server-Laptop es per `git pull` erhält.

---

## Backup

`backup.bat` kopiert die aktuelle Datenbankdatei mit Zeitstempel in den Ordner `backup/`.
Empfehlung: täglich ausführen oder via Windows Task Scheduler automatisieren.

---

## Sicherheit

Die Applikation ist für den Betrieb im **internen Netzwerk** ausgelegt – die Teilnehmer greifen während der Erhebung über `http://<pc-name>:5000` zu (kein Internet, kein HTTPS). Folgende Massnahmen sind umgesetzt:

- **Sitzungsschlüssel**: Beim ersten Start wird automatisch ein zufälliger `SECRET_KEY` erzeugt und in `backend/data/secret_key` gespeichert (nicht im Repo). Es ist keine manuelle Konfiguration nötig; ein bekannter Standard-Schlüssel wird nie verwendet. Optional kann der Schlüssel weiterhin über die `.env` gesetzt werden.
- **PINs**: Werden mit bcrypt gehasht gespeichert (nie im Klartext). Teilnehmer müssen den Start-PIN beim ersten Login durch einen eigenen ersetzen, bevor sie Daten erfassen können.
- **Login-Schutz**: Wiederholte Fehlversuche werden pro Gerät gedrosselt (Schutz gegen automatisiertes Durchprobieren).
- **Rollen-/Zugriffsschutz**: Admin- und Teilnehmer-Funktionen sind serverseitig getrennt; Teilnehmer sehen und ändern nur eigene Einträge.
- **Anonymer Export**: Der HTML-Export enthält keine Namen oder E-Mail-Adressen und ist gegen Code-Einschleusung (XSS) abgesichert.

### Bewusst akzeptiertes Restrisiko

Da der Zugriff über **HTTP** (ohne Verschlüsselung) im lokalen Netz erfolgt, werden Anmelde-PIN und Sitzungscookie unverschlüsselt übertragen. Wer den Netzwerkverkehr im selben Netz mitlesen kann, könnte diese abgreifen. Für eine zeitlich begrenzte, interne Erhebung ist dies eine bewusste Abwägung zugunsten der einfachen Erreichbarkeit (`http://<pc-name>:5000`). Eine Umstellung auf HTTPS würde diesen Zugriffsweg verändern und ist daher nicht vorgesehen.


---

## Produktiv- und Read-only-Modus

Mit `START_APP.bat` kann dieselbe Codebasis wahlweise produktiv oder als
Read-only-Kopie gestartet werden. Im Produktivmodus werden konsistente SQLite-
Backups automatisch in einen konfigurierten Netzwerkordner geschrieben. Der
Read-only-Modus kopiert das neuste vollständige Backup zuerst auf die lokale
Festplatte und sperrt alle Änderungen serverseitig.

Einrichtung, Konfiguration und Sicherheitsgrenzen sind in
[`BETRIEBSMODI.md`](BETRIEBSMODI.md) beschrieben.

## Erfassung und Raumplanung ab Oktober 2026

Neue Einträge verwenden fünf feste Grundtypen: Allein arbeiten, Online-Meeting /
Telefonat (einschliesslich hybrider Meetings), Besprechung / Zusammenarbeit vor Ort,
Arbeitsfreie Zeit wegen Teilzeit und Andere Abwesenheit. Pro Standort eine eigene
Erhebung anlegen und den Standort im Erhebungsnamen nennen.

Teilnehmende schätzen nur Personen im selben Raum (inklusive sich selbst): nur ich,
2–4, 5–8, 9–12, 13+. Online zugeschaltete Personen werden nicht gezählt; ihre
Anwesenheit ergibt sich als Ja/Nein aus dem Grundtyp. Tatsächlicher Aufenthaltsort,
genutzter Platz und benötigter geschlossener Raum werden getrennt erfasst.
Rückzugsgründe erlauben Mehrfachauswahl. Der Kalender bietet Wochenwahl und das
Kopieren neuer Einträge mit anpassbarem Datum und Zeitfenster.

### Berechnungsregeln

- Arbeitsplatzbelegung: nur tatsächliche Büroarbeitsplätze am untersuchten
  Standort, unabhängig vom Tätigkeitstyp. Besprechungsräume zählen nicht mit.
- Maximum: zuerst unterschiedliche Personen je konkretem Datum und Viertelstunde
  zählen, dann Maximum je Wochentag/Uhrzeit über die Wochen bilden.
- Durchschnittlicher Tag in der Raumplanung: arithmetischer Mittelwert je Uhrzeit
  über Tage, für die alle eingereichten, im Zeitraum zugeordneten Personen
  mindestens einen Eintrag haben. Dokumentierte Abwesenheiten sind echte Nullen.
  Fehlende Personentage werden ausgeschlossen und ihre Zahl angezeigt. Teilweise
  unvollständige Tage können weiterhin verzerren; keine Hochrechnung auf Personen,
  die nicht eingereicht haben. Vollständigkeit separat prüfen.
- Interne Besprechungsräume werden pro Erhebung, tatsächlichem Datum, Zeitfenster
  und Grössenklasse geschätzt: erfasste Personen / Klassenwert, aufgerundet.
  Klassenwerte: 1, 3, 6,5, 10,5, 13. Für 13+ ist 13 eine offene Annahme.
  Gemischte Gruppen mit Gästen werden konservativ als ein Raum je erfassender
  Person gezählt (mögliche Überschätzung). Teilgruppenfilter beeinflussen diese
  Schätzung. Erhebungen werden nicht als identisches Meeting zusammengelegt.
- Genutzte Räume und benötigte geschlossene Räume sind getrennte Perspektiven;
  nicht addieren. Rückzugsgründe können sich überschneiden.
- Das frei filterbare Tätigkeitsprofil behält den Mittelwert der individuellen
  dokumentierten Tage bei. Es umfasst auch Arbeit ausserhalb des Standortes und
  ist keine direkte Arbeitsplatzbelegung.

### Update und historische Daten

Vor dem Update eine Datenbanksicherung erstellen. Beim regulären Serverstart
läuft die Migration `g7b8c9d0e1f2`; danach werden die fünf neuen Grundtypen ergänzt.
Alte Kategorien und Einträge bleiben als Version 1 erhalten. Neue Erfassungen
verwenden Version 2, auch bei bestehenden offenen Erhebungen; frühere
Tätigkeits-Allowlisten gelten hierfür nicht mehr. Bestehende Einträge bleiben
bearbeitbar, werden aber nicht automatisch umgedeutet. Fehlende Angaben zur
Raumnutzung werden in der Planung ausgewiesen und nicht rückwirkend erfunden.
Neue Anwendung und aktualisierte Datenbank gemeinsam verwenden; Read-only-Kopien
benötigen eine Sicherung nach der Migration. Ein Downgrade erfolgt durch
Wiederherstellen der Sicherung zusammen mit der vorherigen Anwendungsversion.

Tests: `python -m pytest -q` (inkl. Datenmigration, Erfassungsvalidierung,
Gleichzeitigkeit über Wochen, dokumentierte Nulltage und Python/HTML-Export-Parität).
Frontend: `cd frontend` und `npm ci --force && npm run build`; Buildinhalt nach
`backend/static` kopieren (wie durch `build.bat`).
