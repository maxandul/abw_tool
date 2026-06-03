# Tätigkeitserhebung Tool – Dokument 2
## Kategorien, Raumtypen & Seed-Daten

> **Hinweis für Cursor:** Dieses Dokument zusammen mit Dokument 1 verwenden wenn die Datenbank angelegt und mit Seed-Daten befüllt wird.

---

## 1. Raumtypen (Standard-Set)

Raumtypen werden beim ersten Start automatisch geseeded. Admins können sie nachträglich verwalten (erstellen, umbenennen, deaktivieren).

| sort_order | name | beschreibung |
|---|---|---|
| 1 | Stiller Arbeitsplatz | Einzelarbeitsplatz für konzentriertes, ungestörtes Arbeiten |
| 2 | Telefonbox | Abgeschlossene Einzelkabine für Telefonate und Videocalls |
| 3 | Kleiner Meetingraum | Raum für 2–4 Personen, vertrauliche oder interne Gespräche |
| 4 | Grosser Meetingraum | Raum für 5+ Personen, Sitzungen und Teaminformationen |
| 5 | Creative Space | Offener Kollaborationsbereich für Workshops und Konzeptarbeit |
| 6 | Empfang / Besucherzone | Bereich für externe Besucher und Gruppenempfänge |
| 7 | Pausenraum | Aufenthaltsbereich für Pausen und informelle Begegnung |
| 8 | Kein Raum nötig | Tätigkeit findet ausserhalb des Büros statt oder ist Abwesenheit |

---

## 2. Kategorien (Standard-Set)

Kategorien werden beim ersten Start automatisch geseeded. Admins können sie nachträglich verwalten (erstellen, bearbeiten, deaktivieren).

**Soft-Delete-Regel:** Kategorien mit bestehenden Einträgen können nicht hart gelöscht werden – nur deaktivieren. Bei Bearbeitung einer bestehenden Kategorie fragt das System: *"Bestehende Kategorie überschreiben oder neue Kategorie erstellen?"*

### 2.1 Stille Tätigkeiten

| sort_order | name | farbe | raumtyp | beschreibung |
|---|---|---|---|---|
| 1 | Ungestörte Admin | #2E86AB | Stiller Arbeitsplatz | Konzentrierte Einzelarbeit die Ruhe erfordert: Führungsarbeit, Protokoll schreiben, Scanning, komplexe Sachbearbeitung |
| 2 | Admin | #5BA4CF | Stiller Arbeitsplatz | Einfachere administrative Einzelarbeit: Ämtli, Ablage, E-Mails beantworten, Routineaufgaben |

### 2.2 Kommunikative Tätigkeiten – Remote (1 Person)

| sort_order | name | farbe | raumtyp | beschreibung |
|---|---|---|---|---|
| 3 | Vertraulicher Call | #E84855 | Telefonbox | Telefonat oder Videocall mit vertraulichem Inhalt: Reklamationsgespräch, sensibles Thema, Beratung |
| 4 | Interner Call | #F4845F | Telefonbox | Internes Telefonat oder Videocall: Teams Meeting, Abstimmung mit Kolleginnen und Kollegen |
| 5 | Call | #F9A26C | Telefonbox | Allgemeines Telefonat: Beratungsgespräch, Auskunft, Anmeldung |

### 2.3 Kommunikative Tätigkeiten – Kleine Gruppe (2–3 Personen)

| sort_order | name | farbe | raumtyp | beschreibung |
|---|---|---|---|---|
| 6 | Vertrauliches 2er/3er Gespräch | #9B2335 | Kleiner Meetingraum | Vertrauliches Gespräch zu zweit oder zu dritt: Mitarbeitendengespräch, Bifa, Konfliktgespräch |
| 7 | Internes 2er/3er Gespräch | #C0392B | Kleiner Meetingraum | Internes Arbeitsgespräch zu zweit oder zu dritt: Fallbesprechung, kurze Abstimmung, Projektarbeit |
| 8 | 2er/3er Gespräch | #E74C3C | Kleiner Meetingraum | Offenes Gespräch zu zweit oder zu dritt mit internen oder externen Personen: BG-Gespräch, Anmeldegespräch |

### 2.4 Kommunikative Tätigkeiten – Gruppe (4+ Personen)

| sort_order | name | farbe | raumtyp | beschreibung |
|---|---|---|---|---|
| 9 | Vertrauliches Gruppengespräch | #1B4F72 | Grosser Meetingraum | Vertrauliches Gespräch in der Gruppe: Führungsaustausch, sensible Teamthemen |
| 10 | Meeting / Austausch | #2980B9 | Grosser Meetingraum | Reguläre Sitzung oder Teaminformation: Teamsitzung, Abteilungsmeeting, Informationsveranstaltung |
| 11 | Workshop / Kollaboration | #8E44AD | Creative Space | Kollaborative Gruppenarbeit: Konzeptentwicklung, Workshopdurchführung, Whiteboard-Session |
| 12 | Gruppenbesuch | #27AE60 | Empfang / Besucherzone | Empfang externer Gruppen: KB-Tag, Open House, Führungen, Infoveranstaltungen für Externe |

### 2.5 Abwesenheit & Sonstiges

| sort_order | name | farbe | raumtyp | beschreibung |
|---|---|---|---|---|
| 13 | Extern / Home Office | #7F8C8D | Kein Raum nötig | Tätigkeit ausserhalb des Büros: Kundenbesuche, Aussendienst, Home Office, Mobile Working. Zählt als nicht anwesend und fliesst in die Sharing-Ratio-Berechnung ein. |
| 14 | Mittagessen intern | #F39C12 | Pausenraum | Mittagspause im Gebäude: Kantine, Aufenthaltsraum, informeller Austausch beim Essen |
| 15 | Mittagessen extern | #E67E22 | Kein Raum nötig | Mittagspause ausserhalb des Gebäudes |
| 16 | Abwesend – Teilzeit | #BDC3C7 | Kein Raum nötig | Nicht gearbeitet aufgrund Teilzeitpensum. Wird vom System vorgeschlagen wenn Vor- oder Nachmittag weniger als 2h erfasst wurden. |
| 17 | Abwesend – andere Gründe | #95A5A6 | Kein Raum nötig | Abwesenheit aus anderen Gründen: Krankheit, Ferien, Militär, Feiertag, Weiterbildung ausser Haus |

---

## 3. Seed-Logik

Der Seed-Prozess läuft beim ersten Start der Applikation automatisch (`flask db seed` oder beim App-Start via `db.create_all()`).

**Reihenfolge:**
1. Raumtypen anlegen (werden von Kategorien referenziert)
2. Kategorien anlegen mit Referenz auf Raumtyp-ID

**Regel:** Seed läuft nur wenn die Tabellen leer sind – nie überschreiben was bereits vorhanden ist.

```python
def seed_default_data():
    """Seed Raumtypen und Kategorien wenn Tabellen leer sind."""
    if Raumtyp.query.count() == 0:
        # Raumtypen anlegen
        ...
    if Kategorie.query.count() == 0:
        # Kategorien anlegen
        ...
    db.session.commit()
```

---

## 4. Sharing-Ratio – Standardwerte

Der Admin setzt die Sharing-Ratio pro Gruppe. Folgende Werte stehen als Auswahl zur Verfügung (Literaturwerte), mit der Möglichkeit einen eigenen Wert einzugeben:

| Wert | Bezeichnung | Beschreibung |
|---|---|---|
| 1.0 | 1:1 | Kein Sharing – jede Person hat einen festen Platz |
| 1.2 | Standard (Default) | Leichtes Sharing – typisches Büro mit gelegentlichem HO |
| 1.4 | Moderat | Regelmässiges Home Office oder Aussendienst |
| 1.6 | Hoch | Viel Aussendienst oder >50% HO-Quote |
| 2.0 | Sehr hoch | Hochflexibel, z.B. Consulting oder Felddienst |

Default-Wert beim Anlegen einer neuen Gruppe: **1.2**

---

## 5. Farbkonzept

Die Kategoriefarben folgen einer inhaltlichen Logik:

| Gruppe | Farbtöne | Begründung |
|---|---|---|
| Stille Tätigkeiten | Blautöne (kühl) | Ruhig, konzentriert, zurückgezogen |
| Calls / Remote | Rot-/Orangetöne | Kommunikativ, aber einzeln |
| Kleine Gespräche | Rottöne | Intensiver, persönlicher Austausch |
| Grosse Meetings | Blau- / Violetttöne | Strukturiert, formell |
| Abwesenheit | Grau- / Erdtöne | Neutral, nicht präsent |
| Sonderfall Extern/HO | Mittelgrau | Abwesend, aber arbeitend |

Farben sind im Admin-Interface pro Kategorie änderbar (Hex-Farbwähler).
