# Tätigkeitserhebung Tool – Dokument 4
## Teilnehmer-Funktionen

> **Hinweis für Cursor:** Dieses Dokument zusammen mit Dokument 1 verwenden wenn Teilnehmer-Funktionen gebaut werden. Dokument 2 zusätzlich beiziehen wenn Kategorien betroffen sind.

---

## 1. Übersicht Teilnehmer-Bereiche

| Bereich | Beschreibung |
|---|---|
| Registrierung | Self-Registration via Gruppen-Link |
| Login | PIN-basierter Einstieg |
| Dashboard | Übersicht eigener Erfassungsstand |
| Kalenderansicht | Zeitblöcke erfassen, bearbeiten, visualisieren |
| Einreichung | Definitives Einreichen aller Einträge |

---

## 2. Registrierung

### 2.1 Ablauf

Teilnehmer erhalten vom Admin einen Registrierungslink:
```
http://<server-ip>:5000/registrierung/<token>
```

Die Registrierungsseite zeigt:
- Gruppenname (aus Token aufgelöst)
- Erhebungszeitraum der Gruppe
- Formular: E-Mail-Adresse + PIN wählen + PIN bestätigen

### 2.2 Validierungen

- Token muss gültig und aktiv sein (Gruppe nicht deaktiviert)
- E-Mail-Adresse darf noch nicht in dieser Gruppe registriert sein
- Wenn E-Mail bereits in einer anderen Gruppe existiert: Account wird verknüpft (kein neuer Account, kein neuer PIN nötig – Teilnehmer loggt sich mit bestehendem PIN ein)
- PIN: mindestens 4 Zeichen, keine weiteren Einschränkungen

### 2.3 PIN-Hinweis

Folgender Hinweis wird bei der PIN-Eingabe angezeigt:

> *"Wähle einen einfachen PIN, den du dir merken kannst. Der Admin kann deinen PIN zurücksetzen, aber nicht einsehen."*

### 2.4 Nach der Registrierung

Weiterleitung direkt zur Kalenderansicht der entsprechenden Gruppe. Kein separater Login-Schritt nötig.

---

## 3. Login

### 3.1 Login-Seite

Felder:
- E-Mail-Adresse
- PIN

Falls die Person in mehreren Gruppen ist: nach erfolgreichem Login Gruppenauswahl anzeigen.

### 3.2 Temporärer PIN (nach Reset durch Admin)

Wenn ein temporärer PIN gesetzt wurde, wird der Teilnehmer nach dem Login aufgefordert, einen neuen PIN zu setzen bevor er weiterkommt.

### 3.3 Gruppenauswahl

Wenn ein Teilnehmer in mehreren Gruppen ist, erscheint nach dem Login eine einfache Auswahlseite:

> *"In welcher Gruppe möchtest du Einträge erfassen?"*

Liste aller Gruppen der Person mit Gruppenname, Zeitraum und Erfassungsstand. Die gewählte Gruppe kann jederzeit oben in der Navigation gewechselt werden.

---

## 4. Dashboard (Teilnehmer)

Übersicht für den eingeloggten Teilnehmer, erreichbar über Navigation.

### Anzeige

- Gruppenname und Erhebungszeitraum
- Einreichungsstatus (OFFEN / EINGEREICHT / IN_BEARBEITUNG / ABGESCHLOSSEN) mit farbiger Statusanzeige
- Erfasste Zeit total (in Stunden)
- Anteil je Kategorie als kompaktes Balkendiagramm (Farben der Kategorien)
- Anzahl Tage mit Einträgen vs. Arbeitstage im Erhebungszeitraum
- Hinweis wenn noch Tage ohne Einträge vorhanden sind
- Button "Zur Kalenderansicht"
- Button "Einreichen" (wenn Status OFFEN oder IN_BEARBEITUNG)

---

## 5. Kalenderansicht

Das zentrale Element der Teilnehmer-Erfassung. Outlook-ähnliche Wochenansicht.

### 5.1 Layout

- Wochenansicht (Mo–Fr), Zeitachse von 07:00 bis 19:00
- 15-Minuten-Raster
- Navigation: Woche vor / zurück, "Heute"-Button
- Nur Tage innerhalb des Erhebungszeitraums der Gruppe sind bearbeitbar – Tage ausserhalb sind ausgegraut
- Wochenenden werden nicht angezeigt

### 5.2 Zeitblöcke anzeigen

Erfasste Einträge erscheinen als farbige Blöcke in der Kalenderansicht:
- Farbe entspricht der Kategorie (Hex-Farbe aus Datenbank)
- Beschriftung: Kategoriename (kurz), bei kleinen Blöcken nur Farbfläche
- Hover-Tooltip: Kategoriename, Zeit von–bis, Dauer

### 5.3 Eintrag erstellen

Klick oder Drag auf freien Bereich öffnet ein Modal mit:
- Zeitraum (von / bis) – vorausgefüllt basierend auf Klickposition, anpassbar via Dropdown im 15-Min-Raster
- Kategorie – Dropdown aller aktiven Kategorien, farbig markiert
- Info-Icon neben Kategorie: öffnet Detailbeschreibung der Kategorie (Infobox)

Validierungen:
- `zeit_von` muss vor `zeit_bis` liegen
- Keine Überschneidung mit bestehenden Einträgen (Fehlermeldung mit Hinweis welcher Eintrag betroffen ist)
- Nur Mo–Fr, nur innerhalb des Erhebungszeitraums
- Nur wenn Status OFFEN oder IN_BEARBEITUNG (sonst read-only)

### 5.4 Eintrag bearbeiten

Klick auf bestehenden Block öffnet dasselbe Modal mit vorausgefüllten Werten. Zusätzlich: Button "Eintrag löschen" mit Bestätigungsdialog.

### 5.5 Hinweis fehlende Buchungen

Kein laufender Hinweis während der Erfassung – die Prüfung erfolgt erst beim Einreichen (siehe Abschnitt 6.1).

Die 2h-Regel dient als Annäherung um vergessene Buchungen oder fehlende Abwesenheitsbuchungen zu erkennen. Es geht nicht um minutengenaue Vollständigkeit, sondern darum grobe Lücken zu identifizieren.

### 5.6 Read-Only-Modus

Wenn Status EINGEREICHT oder ABGESCHLOSSEN:
- Kalenderansicht zeigt Einträge an, aber keine Bearbeitungsmöglichkeit
- Klick auf Block öffnet nur Detailansicht (kein Edit-Modal)
- Banner oben: *"Deine Einträge wurden eingereicht. [Entsperren]"* (Button nur wenn Status EINGEREICHT, nicht bei ABGESCHLOSSEN)

---

## 6. Einreichung

### 6.1 Einreichen

Button "Einreichen" ist verfügbar wenn Status OFFEN oder IN_BEARBEITUNG.

**Schritt 1 – Lückenprüfung:**

Vor dem Bestätigungsdialog prüft das System alle Arbeitstage im Erhebungszeitraum auf Lücken. Geprüft wird pro Tag:

- **Ganztag leer:** Kein einziger Eintrag vorhanden
- **Vormittag leer:** 07:00–12:00 weniger als 2h erfasst
- **Nachmittag leer:** 12:00–19:00 weniger als 2h erfasst

Wenn Lücken gefunden werden, erscheint ein Übersichts-Modal vor dem eigentlichen Einreichungsdialog:

> *"Vor dem Einreichen haben wir folgende mögliche Lücken gefunden:"*

Tabelle mit betroffenen Tagen:

| Tag | Datum | Lücke |
|---|---|---|
| Montag | 03.06.2026 | Ganztag nicht erfasst |
| Mittwoch | 05.06.2026 | Nachmittag < 2h |

Darunter zwei Buttons:
- **"Zurück zur Erfassung"** – Modal schliesst, Teilnehmer kann Einträge nacherfassen. Kalender springt automatisch zur ersten Woche mit einer Lücke.
- **"Trotzdem einreichen"** – Lücken werden als bekannt bestätigt, weiter zu Schritt 2.

Wenn keine Lücken gefunden wurden, entfällt Schritt 1 und der Bestätigungsdialog erscheint direkt.

**Schritt 2 – Bestätigungsdialog:**

> *"Möchtest du alle deine Einträge definitiv einreichen? Nach dem Einreichen kannst du deine Einträge nur noch einsehen, aber selbst wieder entsperren falls du Korrekturen vornehmen musst."*

Buttons: "Einreichen" | "Abbrechen"

Nach Bestätigung:
- Status wechselt zu EINGEREICHT
- Kalenderansicht wechselt in Read-Only-Modus
- Erfolgsmeldung: *"Deine Einträge wurden erfolgreich eingereicht."*

### 6.2 Selbst entsperren

Im Read-Only-Modus (Status EINGEREICHT) erscheint oben ein Banner mit Button "Entsperren".

Klick öffnet Bestätigungsdialog:
> *"Möchtest du deine Einträge zur Bearbeitung entsperren?"*

Nach Bestätigung:
- Status wechselt zu IN_BEARBEITUNG
- Kalenderansicht wird wieder editierbar

### 6.3 Erneut einreichen

Nach Entsperren und Bearbeitung kann der Teilnehmer erneut einreichen (Button "Einreichen"). Status wechselt zu ABGESCHLOSSEN. Danach kein weiteres Entsperren durch Teilnehmer möglich (nur noch Admin).

---

## 7. Navigation & UX-Hinweise

### Navigation

- Oben: Logo / App-Name | Gruppenname (klickbar wenn mehrere Gruppen) | Dashboard | Kalender | Logout
- Aktiver Bereich ist in Navigation hervorgehoben
- Auf mobilen Geräten: kompakte Navigation (Hamburger-Menu oder Tab-Bar unten)

### Allgemeine UX-Prinzipien

- Kategoriefarben sind konsistent in allen Ansichten (Kalender, Dashboard, Dropdown)
- Fehlermeldungen sind klar und auf Deutsch formuliert
- Ladezeiten werden mit einfachem Spinner angezeigt
- Alle Aktionen die Daten verändern haben einen Bestätigungsdialog wenn sie nicht einfach rückgängig gemacht werden können

---

## 8. API-Endpunkte Teilnehmer

Alle Endpunkte erfordern eine aktive Teilnehmer-Session (oder Admin-Session). Rückgabe immer JSON: `{ "data": ..., "error": ... }`.

### Auth

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/registrierung/<token>` | Registrierungsseite (HTML, React Entry) |
| POST | `/api/auth/registrieren` | Account anlegen / Gruppe verknüpfen |
| POST | `/api/auth/login` | Login mit E-Mail + PIN |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/pin-aendern` | PIN ändern (nach temporärem PIN) |

### Einträge

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/eintraege?gruppe_id=<id>&datum_von=<date>&datum_bis=<date>` | Einträge einer Woche laden |
| POST | `/api/eintraege` | Neuen Eintrag erstellen |
| PUT | `/api/eintraege/<id>` | Eintrag bearbeiten |
| DELETE | `/api/eintraege/<id>` | Eintrag löschen |

### Einreichung

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/einreichung?gruppe_id=<id>` | Aktuellen Status laden |
| POST | `/api/einreichung/einreichen` | Einreichen (OFFEN / IN_BEARBEITUNG → EINGEREICHT / ABGESCHLOSSEN) |
| POST | `/api/einreichung/entsperren` | Selbst entsperren (EINGEREICHT → IN_BEARBEITUNG) |

### Dashboard

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/dashboard?gruppe_id=<id>` | Dashboard-Daten des eingeloggten Teilnehmers |

### Kategorien (lesend)

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/kategorien` | Alle aktiven Kategorien (für Dropdown und Infobox) |
