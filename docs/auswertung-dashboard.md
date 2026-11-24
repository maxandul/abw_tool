# Auswertung: Tätigkeiten und Arbeitsumgebung

Das Dashboard wertet jeweils eine Erhebung (ein untersuchter Standort) aus. Es verwendet die aktuelle Erfassungsstruktur (Version 2), wahlweise mit allen bisher gespeicherten oder nur mit eingereichten bzw. abgeschlossenen Eingaben. Frühere Erfassungsstrukturen bleiben über «Historische Auswertung öffnen» zugänglich. Einträge werden nicht umgedeutet. Eine Erhebung mit gemischten Versionen weist historische Einträge und ausgeschlossene Einreichungen ausdrücklich aus.

## Ansichten und Bedienung

- **Überblick:** Nach dokumentierter Zeit geordnete Tätigkeiten und Plätze. Der höchste beobachtete Halbtag führt direkt zu den Einzelbeobachtungen dieses Wochenhalbtags. Bei einer Auswahl ausserhalb des untersuchten Standorts entfallen die Standortplätze und die Besprechungsschätzung.
- **Wochenprofil** zeigt die zehn Wochenhalbtage mit Durchschnitt oder Spitze. Jede Zahl öffnet die zugehörigen Daten mit Personenzahl, Arbeitszeit, Zeitanteil und Vollständigkeit. In der Gesamtzeile zählt jede Person pro Halbtag einmal. Unter der Tabelle stehen Dauer und Zeitanteil je Zeile über die ganze Erhebung. Bei zwei Merkmalen zeigen zusätzliche Balken, wie sich die ausgewählte Arbeitszeit innerhalb jeder Gruppe verteilt. «Verlauf anzeigen» öffnet die Wochenmittel und einzelnen Halbtage für die gesamte Auswahl in zeitlicher Reihenfolge.
- **Tätigkeiten und Plätze:** Die Fragestellung bestimmt die Leserichtung. Die Zeilen verteilen entweder die Zeit einer Tätigkeit auf Plätze oder die Zeit an einem Platz auf Tätigkeiten. Stunden und Prozentwerte verwenden in der Ansicht und im CSV jeweils dieselbe Zeilenbasis. Ausserhalb des Standorts ist die Platzangabe «Nicht anwendbar».


Tätigkeit, Arbeitsort, genutzter Platz am Standort, Gruppengrösse (inklusive eigener Person), Personenkreis und Online-Zuschaltung sowie **OE, Funktion, Beschäftigungsgrad und Pensumsbereiche** stehen zur Aufteilung zur Verfügung. Pensumsbereiche: bis 60 %, über 60 bis 80 %, über 80 %. Sie sind beschreibend; es erfolgt keine zusätzliche Gewichtung der Zeitwerte mit dem Pensum.

Checkboxfilter benötigen keine Strg-/Cmd-Taste. Lange Listen sind durchsuchbar; «Alle verfügbaren auswählen» wählt die verfügbaren Werte der aktuellen Suche. «Zurücksetzen» entfernt die Einschränkung dieses Merkmals. Aktive Werte erscheinen als einzeln entfernbare Chips. Innerhalb eines Merkmals gilt «oder», zwischen Merkmalen «und». Keine Auswahl bedeutet keine Einschränkung. Die Filter und ihre Werte bleiben am selben Platz. Graue Werte haben in der aktuellen Kombination keine Treffer. Bereits gewählte Werte können jederzeit entfernt werden. Ein Wechsel des Arbeitsorts behält Merkmals- und Personenfilter bei. Der Arbeitsort hat eine zentrale Auswahl; ältere gespeicherte Mehrfachauswahlen bleiben als Chips erhalten.

Fehlende und nicht anwendbare Angaben werden getrennt behandelt. Rückzugsbedarf und Rückzugsgründe werden im aktuellen Formular nicht erhoben und deshalb nicht angeboten. Aus tatsächlicher Nutzung wird kein ungedeckter Raumbedarf abgeleitet.

**Auswahl zum Vergleich festhalten** speichert Arbeitsort und Merkmalsfilter. Die Schaltfläche steht bei den Filtern. Nach Änderung der aktuellen Auswahl springt «Zum Vergleich» zur Tabelle. Ihre Spalten nennen die tatsächlichen Auswahlen. Die Differenz der Zeitanteile wird in Prozentpunkten ausgewiesen (aktuell abzüglich festgehalten). Der Hinweis zu gemeinsamen Halbtagen vergleicht Datum und Tageshälfte, auch wenn die Anzahl der Halbtage beider Gruppen identisch ist. Beide Ausschnitte verwenden dieselbe Statusgruppe, Tageszeiten, Mindestvollständigkeit und Prozentbasis. Die Vergleichstabelle zeigt Personenmittel und Zeitanteile sowie für beide Auswahlen Personenzahl, Vollständigkeit und ausgewertete Halbtage. Personenbalken verwenden dieselbe Skala. Die Heatmap orientiert sich an der Grösse des aktuellen bzw. grösseren verglichenen Personenkreises; sie skaliert nicht nach dem jeweils höchsten Tätigkeitswert.

«Mit einer Fragestellung einsteigen» öffnet vorbereitete Ansichten für Tätigkeit × Platz, Telefonate am Büroarbeitsplatz, Tätigkeitsprofile nach OE, Arbeitsorte nach Funktion, Gruppengrössen und Besprechungen mit Online-Zuschaltung. Sie setzen Arbeitsort, Filter und Aufteilung; Tageszeiten und Statusgruppe bleiben bestehen. «Ansicht zurücksetzen» führt zum Überblick mit der ursprünglichen Datenbasis der Erhebung. Gespeicherte Ansichten bleiben erhalten. Eigene Ansichten inklusive Vergleich und Prozentbasis können in jeder Ansicht benannt gespeichert und gelöscht werden. Speicherung erfolgt pro Erhebung im lokalen Browser, nicht zentral.

Gespeicherte Ansichten aus «Details erkunden» öffnen im Wochenprofil mit ihrer bisherigen Aufteilung. Eine gespeicherte Verlaufsansicht öffnet das Wochenprofil mit eingeblendetem Verlauf.

HTML und PDF übernehmen die geöffnete Halbtagansicht, den eingeblendeten Verlauf und eine geöffnete Lesehilfe. Im HTML lassen sie sich auch nach dem Export öffnen und schliessen. Das PDF verwendet A4 quer. Im CSV enthält das Wochenprofil die Matrix mit Zeitanteilen und Arbeitsminuten, die gewählte Aufteilung und gegebenenfalls die geöffnete Einzelansicht. Bei eingeblendetem Verlauf kommen Wochenmittel und alle einzelnen Halbtage der gesamten Auswahl hinzu.

## Beschriftungen und Lesehilfe

Die Oberfläche spricht von **Vollständigkeit der Angaben**, **Zeit ohne Angaben**, **Personen im Mittel** und **höchstem erfassten Halbtag**. Sie unterscheidet berücksichtigte Personen und unterschiedliche Personen mit passenden Tätigkeiten. Einreicherstatus ist kein Vollständigkeitsnachweis.

Die verwendeten Tageszeiten und eine aktive Mindestvollständigkeit sind auch bei geschlossenen Einstellungen sichtbar. **Auswertung anpassen** erklärt die Halbtaggrenze und die Berechnung der Vollständigkeit. **So liest du die Auswertung** bündelt aufklappbar Rechenbeispiele, null versus fehlende Angaben, unterschiedliche Personenzahlen, Rundung und Grenzen der Interpretation. **So wird die Besprechungszahl geschätzt** erläutert die Heuristik separat.

## Zeitfenster und Datenbasis

Der Nachmittag beginnt um 12:30 Uhr. Alle erfassten Tätigkeitsminuten zählen, auch über Mittag. Die Referenzzeiten für die Vollständigkeit und die Schätzung gleichzeitiger Besprechungen sind 08:00 bis 12:00 und 13:00 bis 17:00 Uhr. Frühere gespeicherte Ansichten verwenden dieselbe feste Halbtaggrenze.

Die Datenbasis ist wählbar: **Zwischenstand – alle bisherigen Eingaben** (Standard bei offenen Erhebungen) oder **nur eingereichte Eingaben** (Standard bei abgeschlossenen Erhebungen). Die Admin-API liefert dafür beide Statusgruppen; die historische Auswertung und ihr bisheriger Export bleiben auf eingereichte Angaben beschränkt. Einreichungsstatus ist kein Vollständigkeitsnachweis.

Alle zugeordneten Personen der gewählten Datenbasis zählen zur erwarteten Zeit, auch Personen ohne Einträge. Ausschliesslich historische Erfassungen werden weiterhin separat ausgewertet und hier ausgewiesen. Personenfilter begrenzen den betrachteten Personenkreis. Tätigkeits- und Ortsfilter verändern dessen Erfassungsabdeckung nicht.

Für jeden konkreten Halbtag wird die dokumentierte Fensterzeit einschliesslich Teilzeit, anderer Abwesenheiten und Arbeit anderswo durch die erwartete Fensterzeit aller betrachteten Personen geteilt. Zeitüberlappungen werden bei der Abdeckung nur einmal gezählt. Fehlende Zeit bleibt **nicht dokumentiert / unbekannt** und wird weder als Abwesenheit angenommen noch proportional verteilt. 85 % sind standardmässig eine Warnmarke. Optional können nur Halbtage mit mindestens 85 %, 95 % oder 100 % dokumentierter Zeit ausgewertet werden. Diese Bedingung gilt für den gesamten gewählten Personenkreis; die Vollständigkeitsanzeige behält alle fälligen Halbtage und die Anzahl zusätzlich ausgeschlossener Halbtage bleibt sichtbar.

- **Personen je Halbtag** zählt jede Person pro Datum, Tageshälfte und gewählter Tätigkeit einmal. In der Gesamtzeile zählt die Person über alle ausgewählten Tätigkeiten hinweg einmal. Ein Eintrag über 12:30 Uhr zählt in beiden Halbtagen und die Minuten werden an der Grenze aufgeteilt.
- **Durchschnitt je Wochenhalbtag:** Mittel der konkreten Halbtage mit mindestens einer Angabe im betrachteten Personenkreis. Ein dokumentierter Halbtag ohne passende Tätigkeit ist null. Ein völlig fehlender Halbtag hat keinen Zahlenwert und wird im Belegungsmittel ausgelassen; er bleibt mit 0 % Abdeckung in der Datenqualität sichtbar. Dadurch sind Mittelwerte bedingt auf dokumentierte Halbtage und keine unbeeinflusste Schätzung für alle Tage.
- **Tagesmittel / Ø:** Mittel über Vor- und Nachmittage mit Angaben. Die Anzahl vorhandener Vor- und Nachmittage beeinflusst das Mittel.
- **Spitze:** stärkster bisher erfasster konkreter Halbtag; keine Vereinigung verschiedener Wochen und keine exakte Gleichzeitigkeitsspitze. Datum und Abdeckung des Spitzentags sind in den Zellendetails sichtbar. Unter 85 % erhält die Spitze ein Sternchen; unterschiedliche Abdeckung kann die Rangfolge beeinflussen.
- **Zeitanteile:** wahlweise Tätigkeitsminuten / gesamte dokumentierte Arbeitszeit im gewählten Arbeitsort und Personenprofil (Standard, vor Tätigkeitsfiltern) oder / dokumentierte Arbeitszeit innerhalb der gefilterten Auswahl. Die Bezugsbasis steht direkt an der Darstellung und im Export. Abwesenheiten und unbekannte Zeit gehören nicht in die Arbeitszeitverteilung. Die gruppenweise gestapelten Balken und die Kreuztabelle verwenden ausdrücklich eine eigene Bezugsbasis je Gruppe bzw. Tätigkeit.

Die Wochenmatrix enthält zusätzliche Zeilen für **Vollständigkeit der Angaben** und **Ausgewertete / fällige Halbtage**. Auch ohne Tätigkeitsdaten bleibt die Abdeckung sichtbar. Ein vollständig leerer vergangener Halbtag ist unbekannt, nicht null. Bei dokumentierter Abwesenheit oder dokumentierter Arbeit anderswo ist die Standortbelegung dagegen eine bekannte null.

Bei einer Aufteilung nach Personenmerkmalen werden Vollständigkeit und Halbtage mit Angaben zusätzlich je Gruppe bestimmt. Angaben einer anderen OE machen einen vollständig fehlenden Halbtag dieser OE nicht zu null. Gruppenweise Personenmittel können deshalb auf unterschiedlichen Halbtagen beruhen und sind nicht zwingend zur eigenständig berechneten Gesamtauswahl addierbar.

Die API friert Datum, Uhrzeit und ISO-Zeitstempel in Europe/Zurich beim Abruf ein. Zukünftige bzw. noch nicht begonnene Halbtage gelten als noch nicht fällig und erzeugen keine Lücken. Laufende Halbtage sind standardmässig ausgenommen. Optional lassen sie sich vorläufig einbeziehen: Einträge zählen höchstens bis zum Berichtszeitpunkt. Die Abdeckung enthält dann auch noch offene, nicht verstrichene Fensterzeit. Der HTML-Bericht behält beim späteren Öffnen denselben Zeitpunkt; es entstehen keine zusätzlichen Lücken durch Zeitablauf.

Durchschnittliche Personenzahlen werden mit bis zu einer Nachkommastelle angezeigt. Einzelne Personenzahlen und Spitzen sind ganzzahlig. Rundungsdifferenzen sind möglich. Teilzeit wird nicht zusätzlich mit dem Beschäftigungsgrad gewichtet. Kleine positive Zeitmengen können gerundet 0 h ergeben, bleiben aber in der Abdeckung berücksichtigt.

«Daten aktualisieren» holt einen neuen Snapshot, ohne die gewählten Filter, Datenbasis oder Ansicht zurückzusetzen.

## Grobe Annäherung gemeinsamer Besprechungen

Je konkretem Datum und überlappendem 15-Minuten-Abschnitt werden Meldungen von Besprechungen am Standort derselben Erhebung, Grössenklasse, tatsächlichen Raumnutzung, Hybrid-Angabe und desselben Personenkreises gebündelt. Der feine interne Rechenschritt dient ausschliesslich der Zusammenfassung überlappender Angaben; Ergebnisse bleiben auf Halbtagsebene.

Rein interne Meldungen werden durch den Klassenwert 3 / 6,5 / 10,5 / 13 geteilt und auf die nächste ganze Sitzung gerundet, mindestens eine. Vier Meldungen der Klasse 2–4 ergeben ungefähr eine gemeinsame Besprechung. Bei 13+ ist 13 eine Annahme. Unterschiedliche tatsächliche Sitzungen können in denselben Bündel fallen; diese Heuristik identifiziert keine Sitzungen.

Die Bündelung erfolgt mit der gesamten gewählten Statusgruppe (Zwischenstand oder eingereicht) **vor** Personen- oder Tätigkeitsfiltern. Ein gefilterter Ausschnitt erhält einen Anteil entsprechend seinen Meldungen. So erzeugt ein Teilgruppenfilter keine zusätzlichen Sitzungen durch erneutes Aufrunden. Bei gemischten Gruppen mit Gästen fehlt die interne Gruppengrösse: jede Meldung zählt als mögliche Sitzung; dies kann überschätzen.

Die Zahl gleichzeitig laufender Besprechungen wird über die vier Referenzstunden gemittelt. Die Schätzung gibt eine Orientierung zur Intensität der Zusammenarbeit, keine Empfehlung für eine Raumanzahl. Wegen der groben Blockerfassung sind auch diese Werte nur eine Annäherung.

## Export und Technik

«Interaktiven Bericht exportieren» erzeugt ein selbständiges HTML ohne Netzwerkabhängigkeiten mit der aktuellen Ansicht als Startzustand. Es enthält pseudonymisierte Daten der gewählten Statusgruppe und den festen Snapshot-Zeitpunkt, keine Namen, E-Mail-Adressen oder frei vergebenen Eintragsnamen. Ein Export mit «nur eingereichte Eingaben» entfernt nicht eingereichte Personen und ihre Einträge aus der Datei; dieser Bericht bietet keinen Wechsel auf nicht enthaltene Entwürfe. Ein Zwischenstand enthält auch nicht eingereichte Angaben. Filter sind offline änderbar. Funktion, OE und Beschäftigungsgrad bleiben für die Analyse enthalten; der Bericht ist deshalb nicht als anonym im strengen Sinn zu verstehen.

CSV exportiert die jeweils aktive Ansicht (Überblick, Wochenprofil oder Tätigkeiten und Plätze) und einen aktiven Vergleich, verwendet Semikolon und UTF-8 mit BOM für Excel; Statusgruppe, Snapshot, offene Stunden, Bezugsbasis, Filter, Halbtaggrenze und Wochenkennzahl stehen im Export. Abdeckung und Beobachtungszahlen sind enthalten, bei Spitzen zusätzlich Datum und Abdeckung je Spitzentag. Drucken/PDF verwendet die jeweils sichtbare Ansicht.

`backend/services/activity_dashboard.js` enthält die gemeinsame Berechnung und Darstellung für React und HTML-Export. `activity_dashboard.css` wird ebenfalls gemeinsam verwendet. Die API `/api/auswertung/dashboard` ist nur für Admins verfügbar. Datenbankstruktur und Erfassung bleiben unverändert. Vor dem Update `python -m pip install -r requirements.txt` ausführen: `tzdata` stellt die Zürcher Zeitzone auch auf Windows ohne System-Zeitzonendaten bereit. Der eingecheckte Build unter `backend/static` gehört zum Update.

Prüfen: `python -m pytest -q`, `cd frontend && npm run build`. Die Tests führen die tatsächliche JavaScript-Berechnung mit dokumentierten Nullen, fehlenden Halbtagen, Teilgruppen, Filterbezugsbasis, historischen Daten, gemeinsamen Meetings und Spitzen über mehrere Wochen aus. Zusätzliche Fälle: nicht eingereichte Angaben, registrierte Personen ohne Einträge, vollständig leere Halbtage, zukünftige und laufende Halbtage, feste Berichtszeit und statusbeschränkter Offline-Export. Browserprüfung mit synthetischen Daten: Ansichten, Mehrfachfilter, Zellendetails und Speichern/Löschen benannter Ansichten.

## Prüfung der UX-Erweiterung (23.11.2026)

- `python -m pytest -q`: Tests der tatsächlichen JavaScript-Berechnung, einschliesslich Pensumsbereiche, Personenaufteilungen, Prozentbasis, Mindestvollständigkeit, dokumentierte Nullen und fehlende Halbtage einzelner OEs.
- `cd frontend && npm run build`: Produktionsbuild; Dateien aus `frontend/dist` werden für die Auslieferung nach `backend/static` übernommen.
- Optionaler DOM-Test: `npm install --prefix /tmp/abw-dashboard-test jsdom --no-save --ignore-scripts`, danach `NODE_PATH=/tmp/abw-dashboard-test/node_modules node tests/test_dashboard_dom.cjs`. Prüft echte DOM-Ereignisse, Checkboxfilter, Arbeitsortwechsel, Vergleich, Aufteilungen, gespeicherte Ansichten, Zellendetails, Suche, Fokus, sichere Beschriftungen, CSV und statusbeschränkten Offlinebericht. jsdom wird nur für den Test benötigt, nicht für den Betrieb.
- Eine visuelle Browserprüfung war in dieser Ausführungsumgebung nicht möglich: der Browser konnte den lokalen Testserver nicht erreichen und lokale HTML-Dateien waren durch die Browserrichtlinie gesperrt. DOM-Tests prüfen Bedienlogik, keine Pixel oder mobile Layoutgeometrie.
