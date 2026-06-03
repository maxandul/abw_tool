# Tätigkeitserhebung Tool – Dokument 5
## Auswertung & Export

> **Hinweis für Cursor:** Dieses Dokument zusammen mit Dokument 1 verwenden wenn die Auswertung gebaut wird. Dokument 2 zusätzlich beiziehen für Raumtyp- und Kategorienlogik.

---

## 1. Übersicht

Die Auswertung ist ausschliesslich für Admins zugänglich. Sie besteht aus drei Teilen:

| Teil | Beschreibung |
|---|---|
| Wochenansicht – Lastprofil | Heatmap: wann wird welcher Raumtyp wie stark genutzt |
| Raumbedarfstabelle | Empfohlene Anzahl Einheiten pro Raumtyp |
| Anteilsübersicht | Prozentualer Zeitanteil je Raumtyp / Kategorie |

Alle drei Teile reagieren auf dieselben Filter und werden gemeinsam auf einer Seite angezeigt. Der HTML-Export enthält alle drei Teile mit funktionierenden Filtern.

---

## 2. Filter

Oben auf der Auswertungsseite, persistent sichtbar beim Scrollen.

| Filter | Typ | Beschreibung |
|---|---|---|
| Gruppe(n) | Mehrfachauswahl | Einzelne oder mehrere Gruppen kombinieren (Fusionsszenario). Default: alle aktiven Gruppen. |
| Zeitraum von | Datum | Default: frühestes `zeitraum_von` der gewählten Gruppe(n) |
| Zeitraum bis | Datum | Default: spätestes `zeitraum_bis` der gewählten Gruppe(n) |
| Raumtyp | Einzelauswahl | Alle / einzelner Raumtyp. Filtert Wochenansicht und Anteilsübersicht. |
| Wochentag | Mehrfachauswahl | Mo / Di / Mi / Do / Fr. Default: alle. |

Änderungen an Filtern aktualisieren alle drei Auswertungsteile gleichzeitig.

**Hinweis Mehrgruppen-Auswertung:** Wenn mehrere Gruppen mit unterschiedlichen Sharing-Ratios kombiniert werden, verwendet die Raumbedarfstabelle den gewichteten Mittelwert der Ratios (gewichtet nach Teilnehmerzahl je Gruppe).

---

## 3. Wochenansicht – Lastprofil

### 3.1 Darstellung

Outlook-ähnliche Wochenansicht (Mo–Fr, 07:00–19:00) mit 15-Minuten-Auflösung.

- X-Achse: Wochentage (Mo–Fr)
- Y-Achse: Uhrzeit (07:00–19:00)
- Jede Zelle (Wochentag × Zeitslot) zeigt die **durchschnittliche gleichzeitige Belegung** über alle Erhebungswochen
- Färbung: Heatmap pro Raumtyp-Farbe – je intensiver, desto höher die Belegung
- Wenn Filter "Alle Raumtypen": Gesamtbelegung in neutralem Blau
- Wenn Filter "einzelner Raumtyp": Farbe des Raumtyps

### 3.2 Tooltip

Hover über eine Zelle zeigt:

```
Mittwoch, 09:00–09:15
Raumtyp: Stiller Arbeitsplatz
Ø Belegung: 8.3 Personen
Maximum:    12 Personen  (KW 24, Mi)
Minimum:     5 Personen  (KW 22, Mi)
Anzahl Wochen mit Daten: 4
```

### 3.3 Berechnungslogik

Für jeden Zeitslot (Wochentag × 15-Min-Block) über den gewählten Zeitraum:

1. Alle Einträge ermitteln die diesen Slot abdecken (`zeit_von <= slot_start AND zeit_bis > slot_start`)
2. Gruppieren nach Kalenderwoche
3. Pro Woche: Anzahl gleichzeitige Personen in diesem Slot zählen
4. Mittelwert, Maximum, Minimum über alle Wochen berechnen

```python
def berechne_lastprofil(gruppe_ids, datum_von, datum_bis, raumtyp_id=None):
    """
    Gibt pro (wochentag, zeitslot) Mittelwert/Min/Max der gleichzeitigen
    Belegung zurueck. Wochentag: 0=Mo, 4=Fr. Zeitslot: Minuten seit 07:00.
    """
```

### 3.4 Anzeige-Optionen

Toggle-Buttons oberhalb der Wochenansicht:
- **Mittelwert** (Default) – zeigt Durchschnittsbelegung
- **Maximum** – zeigt Spitzenbelegung
- **Minimum** – zeigt Minimalbelegung

---

## 4. Raumbedarfstabelle

### 4.1 Darstellung

Tabelle mit einer Zeile pro aktivem Raumtyp.

| Spalte | Beschreibung |
|---|---|
| Raumtyp | Name des Raumtyps |
| Ø gleichzeitige Nutzung | Mittelwert über alle Zeitslots und Wochen im gewählten Zeitraum |
| Peak-Nutzung | Maximale gleichzeitige Nutzung (absolut, einzelner Slot) |
| Sharing-Ratio | Eingestellte Ratio der Gruppe(n), ggf. gewichteter Mittelwert |
| Einheiten (Ø) | `ceil(Ø Nutzung ÷ Sharing-Ratio)` |
| Einheiten (Peak) | `ceil(Peak-Nutzung ÷ Sharing-Ratio)` |

Zusätzliche Zeile am Ende: **Anwesend total** – Ø und Peak gleichzeitig anwesende Personen (alle Raumtypen ausser "Kein Raum nötig").

### 4.2 Hinweis unter der Tabelle

> *"Die empfohlene Anzahl Einheiten basiert auf der eingestellten Sharing-Ratio ([Wert]). Ø-Werte sind kosteneffizienter, Peak-Werte decken Spitzenlastzeiten ab. Raumtypen ohne Einträge im gewählten Zeitraum werden mit 0 ausgewiesen."*

### 4.3 Berechnungslogik

```python
def berechne_raumbedarf(gruppe_ids, datum_von, datum_bis):
    """
    Gibt pro Raumtyp Ø-Nutzung, Peak-Nutzung und empfohlene
    Einheitenanzahl zurueck (mit und ohne Sharing-Ratio).
    """
    import math
    # Einheiten immer aufrunden
    einheiten_avg = math.ceil(avg_nutzung / sharing_ratio)
    einheiten_peak = math.ceil(peak_nutzung / sharing_ratio)
```

---

## 5. Anteilsübersicht

### 5.1 Darstellung

Zwei Diagramme nebeneinander:

**Diagramm 1 – Anteil je Raumtyp (Donut-Chart)**
- Ein Segment pro Raumtyp
- Farbe: Raumtyp-Farbe (erste Kategorie des Raumtyps, oder neutrale Farbe)
- Legende mit Prozentanteil und absoluten Stunden
- Hover: Details

**Diagramm 2 – Anteil je Hauptgruppe (Balkendiagramm, gestapelt)**
- Stille Tätigkeiten / Kommunikative Tätigkeiten / Abwesenheit & Sonstiges
- Aufgeschlüsselt nach Wochentag (Mo–Fr)
- Zeigt ob Montag/Freitag anders genutzt werden als Wochenmitte

### 5.2 Kennzahlen-Kacheln

Oberhalb der Diagramme vier Kennzahlen als kompakte Kacheln:

| Kachel | Inhalt |
|---|---|
| Anwesenheitsquote | Anteil der Zeit wo Personen anwesend waren (nicht Extern/HO/Abwesend) |
| Stille Arbeit | Anteil Kategorien 1–2 an der Gesamtzeit |
| Kommunikative Arbeit | Anteil Kategorien 3–12 an der Gesamtzeit |
| Ø Anwesende | Durchschnittlich gleichzeitig anwesende Personen |

---

## 6. HTML-Export

### 6.1 Funktionsweise

Flask-Endpunkt `GET /api/auswertung/export` generiert eine vollständig selbstständige HTML-Datei:

- Alle Auswertungsdaten als eingebettetes JSON im `<script>`-Tag
- Dieselben Filter wie in der App (clientseitiges JavaScript)
- Wochenansicht, Raumbedarfstabelle und Anteilsübersicht enthalten
- Keine externen Abhängigkeiten – funktioniert offline, ohne Server
- Schlankes JS-Bundle (vanilla JS oder minimaler Build), keine grossen Libraries

### 6.2 Dateiname

```
auswertung_<gruppenname(s)>_<exportdatum>.html
```

Beispiel: `auswertung_Standort_A_2026-06-03.html`

Bei mehreren Gruppen: `auswertung_Standort_A_Standort_B_2026-06-03.html`

### 6.3 Inhalt der exportierten HTML-Datei

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Auswertung Tätigkeitserhebung – [Gruppenname]</title>
  <style>/* Inline CSS, kein externes Stylesheet */</style>
</head>
<body>
  <header>
    <h1>Tätigkeitserhebung – Auswertung</h1>
    <p>Exportiert am [Datum] | Gruppe(n): [Namen] | Zeitraum: [von–bis]</p>
  </header>

  <!-- Filter (clientseitig, kein Server nötig) -->
  <section id="filter">...</section>

  <!-- Kennzahlen-Kacheln -->
  <section id="kennzahlen">...</section>

  <!-- Wochenansicht Lastprofil -->
  <section id="lastprofil">...</section>

  <!-- Raumbedarfstabelle -->
  <section id="raumbedarf">...</section>

  <!-- Anteilsübersicht -->
  <section id="anteile">...</section>

  <!-- Eingebettete Daten -->
  <script>
    const AUSWERTUNG_DATEN = { /* vollständiges JSON */ };
  </script>

  <!-- Inline JS für Filter und Visualisierungen -->
  <script>/* vanilla JS */</script>
</body>
</html>
```

### 6.4 Filterverhalten im Export

Folgende Filter sind in der exportierten HTML-Datei bedienbar:
- Raumtyp (Dropdown)
- Wochentag (Checkboxen)
- Ansicht Wochenansicht: Mittelwert / Maximum / Minimum

Nicht filterbar im Export (da Daten nur für exportierte Gruppen/Zeitraum vorhanden):
- Gruppe(n) – fest, wie beim Export gewählt
- Zeitraum – fest, wie beim Export gewählt

---

## 7. API-Endpunkte Auswertung

Alle Endpunkte erfordern Admin-Session.

| Method | Endpunkt | Query-Parameter | Beschreibung |
|---|---|---|---|
| GET | `/api/auswertung/lastprofil` | `gruppe_ids`, `datum_von`, `datum_bis`, `raumtyp_id?`, `wochentage?` | Lastprofil-Daten für Wochenansicht |
| GET | `/api/auswertung/raumbedarf` | `gruppe_ids`, `datum_von`, `datum_bis` | Raumbedarfstabelle |
| GET | `/api/auswertung/anteile` | `gruppe_ids`, `datum_von`, `datum_bis`, `raumtyp_id?` | Anteilsübersicht |
| GET | `/api/auswertung/kennzahlen` | `gruppe_ids`, `datum_von`, `datum_bis` | Kennzahlen-Kacheln |
| GET | `/api/auswertung/export` | `gruppe_ids`, `datum_von`, `datum_bis` | HTML-Datei als Download |

### Antwortformat Lastprofil

```json
{
  "data": {
    "slots": [
      {
        "wochentag": 0,
        "slot_start_minuten": 0,
        "raumtyp_id": 1,
        "mittelwert": 8.3,
        "maximum": 12,
        "minimum": 5,
        "anzahl_wochen": 4
      }
    ],
    "raumtypen": [
      { "id": 1, "name": "Stiller Arbeitsplatz", "farbe": "#2E86AB" }
    ]
  },
  "error": null
}
```

### Antwortformat Raumbedarf

```json
{
  "data": {
    "sharing_ratio": 1.2,
    "raumtypen": [
      {
        "id": 1,
        "name": "Stiller Arbeitsplatz",
        "avg_nutzung": 8.3,
        "peak_nutzung": 12,
        "einheiten_avg": 7,
        "einheiten_peak": 10
      }
    ]
  },
  "error": null
}
```

---

## 8. Berechnungshinweise für den Service-Layer

```python
# auswertung_service.py

def get_gleichzeitige_belegung(eintraege, slot_datum, slot_start, slot_ende):
    """
    Zählt wie viele Eintraege einen gegebenen Zeitslot abdecken.
    Ein Eintrag deckt den Slot ab wenn: zeit_von <= slot_start AND zeit_bis > slot_start
    """

def gruppiere_nach_kalenderwoche(eintraege):
    """
    Gruppiert Eintraege nach ISO-Kalenderwoche fuer Mittelwert-Berechnung.
    Wichtig: Nur Wochen mit mindestens einem Eintrag zaehlen fuer den Nenner.
    """

def berechne_gewichtete_sharing_ratio(gruppe_ids):
    """
    Gewichteter Mittelwert der Sharing-Ratios mehrerer Gruppen.
    Gewicht = Anzahl Teilnehmer je Gruppe.
    """

def generiere_export_html(daten, meta):
    """
    Rendert die statische HTML-Datei mit eingebettetem JSON.
    Verwendet Flask render_template_string oder eine dedizierte
    export.html Jinja2-Template-Datei in backend/templates/.
    """
```

**Wichtige Randfall-Behandlung:**
- Wochen mit 0 Einträgen werden nicht in den Nenner des Mittelwerts eingerechnet
- Einträge der Kategorie "Kein Raum nötig" werden in der Raumbedarfstabelle separat ausgewiesen (Zeile "Extern / Abwesend"), nicht als Raumtyp
- Teilnehmer die in mehreren Gruppen sind: Einträge werden pro Gruppe separat gezählt (eine Person kann gleichzeitig in Gruppe A und B erfassen – das ist korrekt, da sie an zwei Standorten tätig ist)
