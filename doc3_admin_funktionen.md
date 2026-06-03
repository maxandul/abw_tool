# Tätigkeitserhebung Tool – Dokument 3
## Admin-Funktionen

> **Hinweis für Cursor:** Dieses Dokument zusammen mit Dokument 1 verwenden wenn Admin-Funktionen gebaut werden. Dokument 2 zusätzlich beiziehen wenn Kategorien oder Raumtypen betroffen sind.

---

## 1. Übersicht Admin-Bereiche

| Bereich | Beschreibung |
|---|---|
| Dashboard | Übersicht Erfassungsstand aller Gruppen |
| Gruppen | Gruppen anlegen, bearbeiten, Registrierungslink verwalten |
| Teilnehmer | Teilnehmer pro Gruppe verwalten, PIN zurücksetzen |
| Kategorien | Kategorien erstellen, bearbeiten, deaktivieren |
| Raumtypen | Raumtypen erstellen, bearbeiten, deaktivieren |
| Auswertung | Visuelle Auswertung, Raumbedarfsrechnung, HTML-Export |

---

## 2. Dashboard

Die erste Seite nach dem Admin-Login. Zeigt den Erfassungsstand aller aktiven Gruppen auf einen Blick.

### Anzeige pro Gruppe

- Gruppenname und Erhebungszeitraum
- Anzahl Teilnehmer total
- Erfassungsstand pro Einreichungsstatus (OFFEN / EINGEREICHT / IN_BEARBEITUNG / ABGESCHLOSSEN) als Fortschrittsanzeige
- Direkte Links zu Gruppe bearbeiten und Auswertung öffnen

### Gesamtübersicht

- Anzahl aktive Gruppen
- Anzahl Teilnehmer total über alle Gruppen
- Anzahl Teilnehmer die noch nichts erfasst haben (0 Einträge)

---

## 3. Gruppen

### 3.1 Gruppe anlegen

Felder:
- `name` (Pflicht) – Gruppenname / Standortbezeichnung
- `zeitraum_von` (Pflicht) – Datum-Picker
- `zeitraum_bis` (Pflicht) – Datum-Picker, muss nach `zeitraum_von` liegen
- `sharing_ratio` – Dropdown mit Standardwerten (siehe Dok. 2, Abschnitt 4) + Freitextfeld für eigenen Wert

Nach dem Anlegen wird automatisch ein `registrierung_link_token` (UUID) generiert. Der Registrierungslink lautet:
```
http://<server-ip>:5000/registrierung/<token>
```

### 3.2 Gruppe bearbeiten

Alle Felder änderbar. Registrierungslink bleibt gleich, ausser Admin generiert explizit einen neuen Token (Button: "Neuen Link generieren" mit Bestätigungsdialog, da alter Link dann ungültig wird).

### 3.3 Gruppenübersicht

Tabelle aller Gruppen mit:
- Name, Zeitraum, Sharing-Ratio
- Anzahl Teilnehmer
- Erfassungsstand (kompakt)
- Aktionen: Bearbeiten | Link kopieren | Auswertung | Deaktivieren

### 3.4 Gruppen deaktivieren

Keine harte Löschung. Deaktivierte Gruppen erscheinen nicht mehr im Dashboard, Daten bleiben erhalten und sind weiterhin auswertbar.

---

## 4. Teilnehmer

### 4.1 Teilnehmerübersicht pro Gruppe

Tabelle mit:
- E-Mail-Adresse
- Gruppe(n)
- Einreichungsstatus
- Anzahl erfasste Einträge
- Letzter Eintrag (Datum)
- Aktionen: PIN zurücksetzen | Aus Gruppe entfernen | Einreichung entsperren / abschliessen

### 4.2 Teilnehmer nachträglich hinzufügen

Admin kann eine E-Mail-Adresse manuell einer Gruppe hinzufügen. Falls die E-Mail bereits existiert (Person in anderer Gruppe), wird der bestehende Account verknüpft. Falls neu, wird ein Account angelegt und ein temporärer PIN gesetzt, den der Admin kommuniziert.

### 4.3 Teilnehmer aus Gruppe entfernen

Entfernt die Verknüpfung (`GruppenMitglied`-Eintrag). Bestehende Einträge dieser Person in der Gruppe bleiben erhalten (für Auswertung). Der Account selbst bleibt bestehen.

### 4.4 PIN zurücksetzen

Admin setzt einen neuen temporären PIN (4-stellig, zufällig generiert). Der temporäre PIN wird im Admin-Interface angezeigt (einmalig, danach nur noch zurücksetzbar). Admin kommuniziert den PIN direkt an den Teilnehmer. Beim nächsten Login wird der Teilnehmer aufgefordert, einen neuen PIN zu setzen.

### 4.5 Einreichungsstatus verwalten

Admin kann folgende Statusübergänge auslösen:
- `EINGEREICHT` → `IN_BEARBEITUNG` (Entsperren für Nachbearbeitung)
- `IN_BEARBEITUNG` → `ABGESCHLOSSEN` (Manuell abschliessen)

---

## 5. Kategorien

### 5.1 Kategorienübersicht

Tabelle aller Kategorien (aktive und deaktivierte) mit:
- Farbvorschau (farbiges Quadrat)
- Name
- Zugeordneter Raumtyp
- Anzahl bestehende Einträge
- Status (Aktiv / Deaktiviert)
- Aktionen: Bearbeiten | Deaktivieren / Reaktivieren

### 5.2 Kategorie erstellen

Felder:
- `name` (Pflicht)
- `beschreibung` – Textarea (wird als Infobox bei Teilnehmern angezeigt)
- `farbe` – Hex-Farbwähler mit Vorschau
- `raumtyp_id` – Dropdown aller aktiven Raumtypen (nullable: "Kein Raumtyp")
- `sort_order` – Zahl, bestimmt Anzeigereihenfolge

### 5.3 Kategorie bearbeiten

Beim Speichern einer Änderung erscheint ein Dialog:

> *"Möchtest du die bestehende Kategorie überschreiben oder eine neue Kategorie erstellen?"*
> - **Überschreiben** – bestehende Einträge verweisen weiterhin auf diese Kategorie, zeigen aber ab sofort den neuen Namen / die neue Farbe
> - **Neue Kategorie erstellen** – bestehende Einträge bleiben unverändert, neue Kategorie wird zusätzlich angelegt

### 5.4 Kategorie deaktivieren

- Wenn keine Einträge vorhanden: sofort deaktivieren
- Wenn Einträge vorhanden: Bestätigungsdialog mit Hinweis *"X Einträge verweisen auf diese Kategorie. Die Kategorie wird deaktiviert und ist für neue Einträge nicht mehr wählbar. Bestehende Einträge bleiben unverändert."*
- Hartes Löschen ist nie möglich wenn Einträge vorhanden

---

## 6. Raumtypen

Analog zu Kategorien, aber einfacher (kein Farbwähler, keine Beschreibung für Infobox).

### 6.1 Raumtypen-Übersicht

Tabelle mit Name, Beschreibung, Anzahl verknüpfte Kategorien, Status, Aktionen.

### 6.2 Raumtyp erstellen / bearbeiten

Felder:
- `name` (Pflicht)
- `beschreibung` – Textarea
- `sort_order`

### 6.3 Raumtyp deaktivieren

Nur möglich wenn keine aktiven Kategorien auf diesen Raumtyp verweisen. Sonst Hinweis welche Kategorien betroffen sind.

---

## 7. Auswertung

### 7.1 Filter

Oben auf der Auswertungsseite stehen folgende Filter zur Verfügung:

- **Gruppe(n)** – Mehrfachauswahl, Gruppen können kombiniert werden (Fusionsszenario)
- **Zeitraum** – Vorausgefüllt mit dem Gruppenerhebungszeitraum, anpassbar
- **Wochentag** – Alle / Mo / Di / Mi / Do / Fr
- **Raumtyp** – Alle / einzelner Raumtyp

### 7.2 Wochenansicht – Lastprofil

Outlook-ähnliche Wochenansicht (Mo–Fr, 07:00–19:00) die zeigt, wie viele Personen gleichzeitig in einer bestimmten Kategorie / einem bestimmten Raumtyp tätig waren.

Anzeige pro Zeitslot (15 Min):
- **Mittelwert** – durchschnittliche gleichzeitige Belegung über alle Erhebungswochen
- **Maximum** – höchste je gemessene gleichzeitige Belegung
- **Minimum** – niedrigste je gemessene gleichzeitige Belegung

Darstellung: Heatmap-Färbung pro Raumtyp, Intensität = Belegungszahl. Tooltip beim Hover zeigt Mittelwert / Min / Max.

### 7.3 Raumbedarfstabelle

Tabelle pro Raumtyp mit folgenden Werten:

| Spalte | Beschreibung |
|---|---|
| Raumtyp | Name des Raumtyps |
| Ø gleichzeitige Nutzung | Mittelwert über alle Zeitslots und Wochen |
| Peak-Nutzung | Maximum gleichzeitige Nutzung (absolut) |
| Sharing-Ratio | Eingestellte Ratio der Gruppe(n) |
| Empfohlene Einheiten (Ø) | Ø Nutzung ÷ Sharing-Ratio, aufgerundet |
| Empfohlene Einheiten (Peak) | Peak-Nutzung ÷ Sharing-Ratio, aufgerundet |

Hinweis unter der Tabelle: *"Die empfohlene Anzahl basiert auf der eingestellten Sharing-Ratio. Peak-Werte decken Spitzenlastzeiten ab, Durchschnittswerte sind kosteneffizienter."*

### 7.4 Anteilsübersicht

Kreisdiagramm oder gestapeltes Balkendiagramm:
- Anteil jedes Raumtyps an der gesamten erfassten Zeit (in %)
- Absolute Stunden pro Raumtyp
- Aufschlüsselung: Stille Tätigkeiten / Kommunikative Tätigkeiten / Abwesenheit

### 7.5 HTML-Export

Button "Auswertung exportieren" generiert eine vollständig selbstständige HTML-Datei:

- Alle Auswertungsdaten sind eingebettet (kein Server nötig)
- Dieselben Filter wie in der App sind in der HTML-Datei bedienbar (clientseitiges JavaScript)
- Wochenansicht, Raumbedarfstabelle und Anteilsübersicht sind enthalten
- Dateiname: `auswertung_<gruppenname>_<datum>.html`
- Flask-Endpunkt: `GET /api/auswertung/export?gruppe_ids=1,2&zeitraum_von=...`
- Die HTML-Datei wird serverseitig gerendert mit eingebetteten JSON-Daten und einem schlanken JS-Bundle für die Filterlogik

---

## 8. API-Endpunkte Admin

Alle Endpunkte erfordern eine aktive Admin-Session. Rückgabe immer JSON: `{ "data": ..., "error": ... }`.

### Gruppen

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/admin/gruppen` | Alle Gruppen |
| POST | `/api/admin/gruppen` | Neue Gruppe anlegen |
| GET | `/api/admin/gruppen/<id>` | Einzelne Gruppe |
| PUT | `/api/admin/gruppen/<id>` | Gruppe bearbeiten |
| POST | `/api/admin/gruppen/<id>/neuer-token` | Neuen Registrierungslink generieren |
| DELETE | `/api/admin/gruppen/<id>` | Gruppe deaktivieren (Soft-Delete) |

### Teilnehmer

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/admin/gruppen/<id>/teilnehmer` | Teilnehmer einer Gruppe |
| POST | `/api/admin/gruppen/<id>/teilnehmer` | Teilnehmer manuell hinzufügen |
| DELETE | `/api/admin/gruppen/<id>/teilnehmer/<user_id>` | Aus Gruppe entfernen |
| POST | `/api/admin/teilnehmer/<user_id>/pin-reset` | PIN zurücksetzen |
| PUT | `/api/admin/teilnehmer/<user_id>/einreichung/<gruppe_id>` | Status ändern |

### Kategorien

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/admin/kategorien` | Alle Kategorien (inkl. deaktivierte) |
| POST | `/api/admin/kategorien` | Neue Kategorie |
| PUT | `/api/admin/kategorien/<id>` | Bearbeiten (Query-Param: `?modus=ueberschreiben\|neu`) |
| DELETE | `/api/admin/kategorien/<id>` | Deaktivieren (Soft-Delete) |

### Raumtypen

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/admin/raumtypen` | Alle Raumtypen (inkl. deaktivierte) |
| POST | `/api/admin/raumtypen` | Neuer Raumtyp |
| PUT | `/api/admin/raumtypen/<id>` | Bearbeiten |
| DELETE | `/api/admin/raumtypen/<id>` | Deaktivieren (Soft-Delete) |

### Auswertung

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/auswertung/lastprofil` | Wochenansicht-Daten (Query-Params: gruppe_ids, zeitraum_von, zeitraum_bis, raumtyp_id) |
| GET | `/api/auswertung/raumbedarf` | Raumbedarfstabelle |
| GET | `/api/auswertung/anteile` | Anteilsübersicht |
| GET | `/api/auswertung/export` | HTML-Export (Download) |

### Dashboard

| Method | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/admin/dashboard` | Erfassungsstand aller Gruppen |
