# Auswertung: Tätigkeiten und Arbeitsumgebung

Das Dashboard wertet jeweils eine Erhebung (ein untersuchter Standort) aus. Es verwendet nur eingereichte bzw. abgeschlossene Einreichungen und die aktuelle Erfassungsstruktur (Version 2). Frühere Erfassungsstrukturen bleiben über «Historische Auswertung öffnen» zugänglich. Einträge werden nicht umgedeutet. Eine Erhebung mit gemischten Versionen weist historische Einträge und ausgeschlossene Einreichungen ausdrücklich aus.

## Ansichten

- **Überblick:** Tätigkeitsanteile, tatsächliche Platznutzung, zeitgewichtete Personen je Vormittag/Nachmittag, Abwesenheiten.
- **Wochenprofil:** zehn Wochenhalbtage; arithmetischer Durchschnitt oder stärkster konkret beobachteter Halbtag. Eine Zelle zeigt auf Auswahl Anzahl Beobachtungen, durchschnittlich unterschiedliche Beteiligte und Datum der Spitze.
- **Eigene Kombinationen:** bis zu zwei Aufteilungsmerkmale; kombinierbare Mehrfachfilter für Tätigkeitsmerkmale und Personenprofile. Benannte Ansichten werden im lokalen Browser für diese Erhebung gespeichert und können gelöscht werden.

Filterwerte stammen aus den erhobenen Daten und berücksichtigen die anderen Tätigkeitsfilter. Innerhalb eines Merkmals gilt «oder», zwischen Merkmalen «und». Nicht anwendbare Merkmale sind von fehlenden Angaben getrennt. Ein Rückzugsbedarf wird nicht aus der heutigen Raumnutzung abgeleitet. Rückzugsbedarf und Rückzugsgründe werden im aktuellen Formular nicht mehr erhoben und nicht angeboten.

## Zeitfenster und Datenbasis

Standard: 08–12 Uhr und 13–17 Uhr; unter «Zeitfenster & Datenbasis» anpassbar zwischen 07 und 19 Uhr. Fenster müssen mindestens eine Stunde dauern und dürfen nicht überlappen. Erfasste Tätigkeitsstunden ausserhalb der Fenster werden separat ausgewiesen und sind nicht in den Charts enthalten.

Die Datenbasis ist wählbar: **Zwischenstand – alle bisherigen Eingaben** (Standard bei offenen Erhebungen) oder **nur eingereichte Eingaben** (Standard bei abgeschlossenen Erhebungen). Die Admin-API liefert dafür beide Statusgruppen; die historische Auswertung und ihr bisheriger Export bleiben auf eingereichte Angaben beschränkt. Einreichungsstatus ist kein Vollständigkeitsnachweis.

Alle zugeordneten Personen der gewählten Datenbasis zählen zur erwarteten Zeit, auch Personen ohne Einträge. Ausschliesslich historische Erfassungen werden weiterhin separat ausgewertet und hier ausgewiesen. Personenfilter begrenzen den betrachteten Personenkreis. Tätigkeits- und Ortsfilter verändern dessen Erfassungsabdeckung nicht.

Für jeden konkreten Halbtag wird die dokumentierte Fensterzeit einschliesslich Teilzeit, anderer Abwesenheiten und Arbeit anderswo durch die erwartete Fensterzeit aller betrachteten Personen geteilt. Zeitüberlappungen werden bei der Abdeckung nur einmal gezählt. Fehlende Zeit bleibt **nicht dokumentiert / unbekannt** und wird weder als Abwesenheit angenommen noch proportional verteilt. 85 % sind eine Warnmarke, keine Ausschlussgrenze.

- **Zeitgewichtete Personen:** bisher erfasste passende Tätigkeitsminuten / ganze Fensterdauer. Zwei Personen während je einer halben Fensterdauer ergeben eine Person im Mittel. Keine Hochrechnung auf fehlende Angaben oder Personen.
- **Durchschnitt je Wochenhalbtag:** Mittel der konkreten Halbtage mit mindestens einer Angabe im betrachteten Personenkreis. Ein dokumentierter Halbtag ohne passende Tätigkeit ist null. Ein völlig fehlender Halbtag hat keinen Zahlenwert und wird im Belegungsmittel ausgelassen; er bleibt mit 0 % Abdeckung in der Datenqualität sichtbar. Dadurch sind Mittelwerte bedingt auf dokumentierte Halbtage und keine unbeeinflusste Schätzung für alle Tage.
- **Tagesmittel / Ø:** Mittel über Vor- und Nachmittage mit Angaben. Die Anzahl vorhandener Vor- und Nachmittage beeinflusst das Mittel.
- **Spitze:** stärkster bisher erfasster konkreter Halbtag; keine Vereinigung verschiedener Wochen und keine exakte Gleichzeitigkeitsspitze. Datum und Abdeckung des Spitzentags sind in den Zellendetails sichtbar. Unter 85 % erhält die Spitze ein Sternchen; unterschiedliche Abdeckung kann die Rangfolge beeinflussen.
- **Zeitanteile:** Tätigkeitsminuten / dokumentierte Arbeitszeit im gewählten Ort und Personenprofil. Tätigkeitsfilter verändern den Zähler, nicht die Bezugsbasis. Abwesenheiten und unbekannte Zeit gehören nicht in den Tätigkeitsmix.
- **Beteiligte Personen:** unterschiedliche Personen mit mindestens einer passenden Tätigkeit im Halbtag; über Tätigkeiten nicht addierbar.

Die Wochenmatrix enthält zusätzliche Zeilen für **Erfassungsabdeckung** und **Halbtage mit Angaben / fällige Halbtage**. Auch ohne Tätigkeitsdaten bleibt die Abdeckung sichtbar. Ein vollständig leerer vergangener Halbtag ist unbekannt, nicht null. Bei dokumentierter Abwesenheit oder dokumentierter Arbeit anderswo ist die Standortbelegung dagegen eine bekannte null.

Die API friert Datum, Uhrzeit und ISO-Zeitstempel in Europe/Zurich beim Abruf ein. Zukünftige bzw. noch nicht begonnene Halbtage gelten als noch nicht fällig und erzeugen keine Lücken. Laufende Halbtage sind standardmässig ausgenommen. Optional lassen sie sich vorläufig einbeziehen: Einträge zählen höchstens bis zum Berichtszeitpunkt, geteilt durch die ganze Fensterdauer. Die Abdeckung enthält dann auch noch offene, nicht verstrichene Fensterzeit. Der HTML-Bericht behält beim späteren Öffnen denselben Zeitpunkt; es entstehen keine zusätzlichen Lücken durch Zeitablauf.

Alle Ergebniswerte werden ohne Nachkommastellen dargestellt (kleine positive Personenwerte als «<1»). Rundungsdifferenzen sind möglich. Teilzeit wird nicht zusätzlich mit dem Beschäftigungsgrad gewichtet. Kleine positive Zeitmengen können gerundet 0 h ergeben, bleiben aber in der Abdeckung berücksichtigt.

«Daten aktualisieren» holt einen neuen Snapshot, ohne die gewählten Filter, Fenster, Datenbasis oder Ansicht zurückzusetzen.

## Grobe Annäherung gemeinsamer Besprechungen

Je konkretem Datum und überlappendem 15-Minuten-Abschnitt werden Meldungen von Besprechungen am Standort derselben Erhebung, Grössenklasse, tatsächlichen Raumnutzung, Hybrid-Angabe und desselben Personenkreises gebündelt. Der feine interne Rechenschritt dient ausschliesslich der Zusammenfassung überlappender Angaben; Ergebnisse bleiben auf Halbtagsebene.

Rein interne Meldungen werden durch den Klassenwert 3 / 6,5 / 10,5 / 13 geteilt und auf die nächste ganze Sitzung gerundet, mindestens eine. Vier Meldungen der Klasse 2–4 ergeben ungefähr eine gemeinsame Besprechung. Bei 13+ ist 13 eine Annahme. Unterschiedliche tatsächliche Sitzungen können in denselben Bündel fallen; diese Heuristik identifiziert keine Sitzungen.

Die Bündelung erfolgt mit der gesamten gewählten Statusgruppe (Zwischenstand oder eingereicht) **vor** Personen- oder Tätigkeitsfiltern. Ein gefilterter Ausschnitt erhält einen Anteil entsprechend seinen Meldungen. So erzeugt ein Teilgruppenfilter keine zusätzlichen Sitzungen durch erneutes Aufrunden. Bei gemischten Gruppen mit Gästen fehlt die interne Gruppengrösse: jede Meldung zählt als mögliche Sitzung; dies kann überschätzen.

Sitzungsäquivalente werden zeitgewichtet je Halbtag gemittelt. Sie sind eine Orientierung zur Intensität der Zusammenarbeit, keine Empfehlung für eine Raumanzahl. Wegen der groben Blockerfassung sind auch diese Werte nur eine Annäherung.

## Export und Technik

«Interaktiven Bericht exportieren» erzeugt ein selbständiges HTML ohne Netzwerkabhängigkeiten mit der aktuellen Ansicht als Startzustand. Es enthält pseudonymisierte Daten der gewählten Statusgruppe und den festen Snapshot-Zeitpunkt, keine Namen, E-Mail-Adressen oder frei vergebenen Eintragsnamen. Ein Export mit «nur eingereichte Eingaben» entfernt nicht eingereichte Personen und ihre Einträge aus der Datei; dieser Bericht bietet keinen Wechsel auf nicht enthaltene Entwürfe. Ein Zwischenstand enthält auch nicht eingereichte Angaben. Filter sind offline änderbar. Funktion, OE und Beschäftigungsgrad bleiben für die Analyse enthalten; der Bericht ist deshalb nicht als anonym im strengen Sinn zu verstehen.

CSV verwendet Semikolon und UTF-8 mit BOM für Excel; Statusgruppe, Snapshot, offene Stunden, Bezugsbasis, Filter, Fenster und Wochenkennzahl stehen im Export. Abdeckung und Beobachtungszahlen sind enthalten, bei Spitzen zusätzlich Datum und Abdeckung je Spitzentag. Drucken/PDF verwendet die jeweils sichtbare Ansicht.

`backend/services/activity_dashboard.js` enthält die gemeinsame Berechnung und Darstellung für React und HTML-Export. `activity_dashboard.css` wird ebenfalls gemeinsam verwendet. Die API `/api/auswertung/dashboard` ist nur für Admins verfügbar. Datenbankstruktur und Erfassung bleiben unverändert. Vor dem Update `python -m pip install -r requirements.txt` ausführen: `tzdata` stellt die Zürcher Zeitzone auch auf Windows ohne System-Zeitzonendaten bereit. Der eingecheckte Build unter `backend/static` gehört zum Update.

Prüfen: `python -m pytest -q`, `cd frontend && npm run build`. Die Tests führen die tatsächliche JavaScript-Berechnung mit dokumentierten Nullen, fehlenden Halbtagen, Teilgruppen, Filterbezugsbasis, historischen Daten, gemeinsamen Meetings und Spitzen über mehrere Wochen aus. Zusätzliche Fälle: nicht eingereichte Angaben, registrierte Personen ohne Einträge, vollständig leere Halbtage, zukünftige und laufende Halbtage, feste Berichtszeit und statusbeschränkter Offline-Export. Browserprüfung mit synthetischen Daten: Ansichten, Mehrfachfilter, Zellendetails und Speichern/Löschen benannter Ansichten.
