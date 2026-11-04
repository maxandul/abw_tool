# Auswertung: Tätigkeiten und Arbeitsumgebung

Das Dashboard wertet jeweils eine Erhebung (ein untersuchter Standort) aus. Es verwendet nur eingereichte bzw. abgeschlossene Einreichungen und die aktuelle Erfassungsstruktur (Version 2). Frühere Erfassungsstrukturen bleiben über «Historische Auswertung öffnen» zugänglich. Einträge werden nicht umgedeutet. Eine Erhebung mit gemischten Versionen weist historische Einträge und ausgeschlossene Einreichungen ausdrücklich aus.

## Ansichten

- **Überblick:** Tätigkeitsanteile, tatsächliche Platznutzung, zeitgewichtete Personen je Vormittag/Nachmittag, Abwesenheiten.
- **Wochenprofil:** zehn Wochenhalbtage; arithmetischer Durchschnitt oder stärkster konkret beobachteter Halbtag. Eine Zelle zeigt auf Auswahl Anzahl Beobachtungen, durchschnittlich unterschiedliche Beteiligte und Datum der Spitze.
- **Eigene Kombinationen:** bis zu zwei Aufteilungsmerkmale; kombinierbare Mehrfachfilter für Tätigkeitsmerkmale und Personenprofile. Benannte Ansichten werden im lokalen Browser für diese Erhebung gespeichert und können gelöscht werden.

Filterwerte stammen aus den erhobenen Daten und berücksichtigen die anderen Tätigkeitsfilter. Innerhalb eines Merkmals gilt «oder», zwischen Merkmalen «und». Nicht anwendbare Merkmale sind von fehlenden Angaben getrennt. Ein Rückzugsbedarf wird nicht aus der heutigen Raumnutzung abgeleitet. Rückzugsbedarf und Rückzugsgründe werden im aktuellen Formular nicht mehr erhoben und nicht angeboten.

## Zeitfenster und Datenbasis

Standard: 08–12 Uhr und 13–17 Uhr; unter «Zeitfenster & Datenbasis» anpassbar zwischen 07 und 19 Uhr. Fenster müssen mindestens eine Stunde dauern und dürfen nicht überlappen. Erfasste Tätigkeitsstunden ausserhalb der Fenster werden separat ausgewiesen und sind nicht in den Charts enthalten.

Ein konkreter Halbtag ist auswertbar, wenn für **jede** eingereichte Person mit mindestens einem aktuellen Eintrag und passendem Personenprofil mindestens 85 % der Fensterdauer dokumentiert sind. Dokumentierte Teilzeit, andere Abwesenheit und Arbeit anderswo decken die Erfassung ab, zählen am Standort aber als null. Fehlende Zeit wird nicht als Abwesenheit angenommen. Ausgeschlossene Halbtage werden gezählt; kein Hochrechnen auf nicht eingereichte Personen. Das strenge gemeinsame Zeitfenster verhindert, dass unterschiedlich vollständige Stichproben als Wochenspitzen verglichen werden.

- **Zeitgewichtete Personen:** Summe der passenden Tätigkeitsminuten im Halbtag / Fensterdauer. Zwei Personen während je einer halben Fensterdauer ergeben eine Person im Mittel.
- **Durchschnitt je Wochenhalbtag:** arithmetischer Mittelwert der auswertbaren konkreten Halbtage dieses Wochentags. Nullwerte zählen mit. Ohne auswertbare Beobachtung erscheint «–».
- **Tagesmittel / Ø:** Mittel über die auswertbaren Halbtage. Die Anzahl verfügbarer Vor- und Nachmittage beeinflusst damit das Mittel; ausgeschlossene Halbtage sind in der Datenbasis sichtbar.
- **Spitze:** Maximum der zeitgewichteten Werte eines konkreten Halbtagdatums, keine Vereinigung von Personen verschiedener Wochen und keine exakte Gleichzeitigkeitsspitze innerhalb des Halbtagfensters.
- **Zeitanteile:** Tätigkeitsminuten / gesamte erfasste Arbeitszeit innerhalb auswertbarer Fenster im ausgewählten Aufenthaltsort und Personenprofil. Tätigkeitsfilter verändern den Zähler, nicht diese Bezugsbasis. Abwesenheiten gehören nicht zur Arbeitszeit.
- **Beteiligte Personen:** unterschiedliche Personen mit mindestens einer passenden Tätigkeit im Halbtag. Über Tätigkeiten nicht addierbar.

Alle Ergebniswerte werden ohne Nachkommastellen dargestellt (kleine positive Personenwerte als «<1»). Rundungsdifferenzen sind möglich. Teilzeit wird nicht zusätzlich mit dem Beschäftigungsgrad gewichtet.

## Grobe Annäherung gemeinsamer Besprechungen

Je konkretem Datum und überlappendem 15-Minuten-Abschnitt werden Meldungen von Besprechungen am Standort derselben Erhebung, Grössenklasse, tatsächlichen Raumnutzung, Hybrid-Angabe und desselben Personenkreises gebündelt. Der feine interne Rechenschritt dient ausschliesslich der Zusammenfassung überlappender Angaben; Ergebnisse bleiben auf Halbtagsebene.

Rein interne Meldungen werden durch den Klassenwert 3 / 6,5 / 10,5 / 13 geteilt und auf die nächste ganze Sitzung gerundet, mindestens eine. Vier Meldungen der Klasse 2–4 ergeben ungefähr eine gemeinsame Besprechung. Bei 13+ ist 13 eine Annahme. Unterschiedliche tatsächliche Sitzungen können in denselben Bündel fallen; diese Heuristik identifiziert keine Sitzungen.

Die Bündelung erfolgt mit der gesamten eingereichten Stichprobe **vor** Personen- oder Tätigkeitsfiltern. Ein gefilterter Ausschnitt erhält einen Anteil entsprechend seinen Meldungen. So erzeugt ein Teilgruppenfilter keine zusätzlichen Sitzungen durch erneutes Aufrunden. Bei gemischten Gruppen mit Gästen fehlt die interne Gruppengrösse: jede Meldung zählt als mögliche Sitzung; dies kann überschätzen.

Sitzungsäquivalente werden zeitgewichtet je Halbtag gemittelt. Sie sind eine Orientierung zur Intensität der Zusammenarbeit, keine Empfehlung für eine Raumanzahl. Wegen der groben Blockerfassung sind auch diese Werte nur eine Annäherung.

## Export und Technik

«Interaktiven Bericht exportieren» erzeugt ein selbständiges HTML ohne Netzwerkabhängigkeiten mit der aktuellen Ansicht als Startzustand. Es enthält pseudonymisierte Daten der gesamten ausgewählten Erhebung, keine Namen, E-Mail-Adressen oder frei vergebenen Eintragsnamen. Filter sind offline änderbar. Funktion, OE und Beschäftigungsgrad bleiben für die Analyse enthalten; der Bericht ist deshalb nicht als anonym im strengen Sinn zu verstehen.

CSV verwendet Semikolon und UTF-8 mit BOM für Excel; Bezugsbasis, Filter, Fenster und Wochenkennzahl stehen im Export. Drucken/PDF verwendet die jeweils sichtbare Ansicht.

`backend/services/activity_dashboard.js` enthält die gemeinsame Berechnung und Darstellung für React und HTML-Export. `activity_dashboard.css` wird ebenfalls gemeinsam verwendet. Die API `/api/auswertung/dashboard` ist nur für Admins verfügbar. Datenbankstruktur und Erfassung bleiben unverändert. Der eingecheckte Build unter `backend/static` gehört zum Update.

Prüfen: `python -m pytest -q`, `cd frontend && npm run build`. Die Tests führen die tatsächliche JavaScript-Berechnung mit dokumentierten Nullen, fehlenden Halbtagen, Teilgruppen, Filterbezugsbasis, historischen Daten, gemeinsamen Meetings und Spitzen über mehrere Wochen aus. Browserprüfung mit synthetischen Daten: Ansichten, Mehrfachfilter, Zellendetails und Speichern/Löschen benannter Ansichten.
