# Automatischer Produktivstart auf dem HR-Laptop

`START_PRODUCTION.bat` startet direkt im Produktivmodus, ohne Modusauswahl,
Browserfenster oder Wartepause. Der Prozess bleibt im Vordergrund der
Windows-Aufgabe. So kann die Aufgabenplanung sein Ende und den Exit-Code erkennen.
Der manuelle Start mit `START_APP.bat` und seiner Modusauswahl bleibt verfügbar.

## Vorbereitung

1. Den neuen Stand auf dem HR-Laptop mit `git pull` übernehmen.
2. Falls noch nicht vorhanden: `setup.bat` einmal erfolgreich ausführen.
   Der automatische Starter verwendet ausdrücklich `venv\Scripts\python.exe`;
   er benötigt keine zuvor aktivierte Python-Umgebung und keinen Python-Eintrag
   im PATH.
3. Projekt und produktive Datenbank auf der lokalen Festplatte belassen.
   Für `BACKUP_TARGET` in der lokalen `.env` einen UNC-Pfad wie
   `\\server\freigabe\abw_backups` verwenden, keinen verbundenen Laufwerksbuchstaben.
4. Den bisher laufenden Produktivserver beenden. `START_PRODUCTION.bat`
   testweise doppelklicken und die App auf einem zweiten Gerät im internen Netz
   aufrufen. Das Fenster bleibt während des Betriebs offen. Zum Beenden Strg+C
   drücken und gegebenenfalls die Batch-Abbruchfrage bestätigen.

Der Starter schreibt seine Ausgaben einschliesslich Fehlern nach
`logs\production.log`. Die Datei wird fortgeschrieben und ist durch
`*.log` bereits von Git ausgeschlossen. Sie ist lokal zu schützen und bei Bedarf
während gestopptem Server zu archivieren oder zu löschen; eine automatische
Logrotation ist nicht enthalten.

## Windows-Aufgabe einmalig einrichten

In der **Aufgabenplanung** «Aufgabe erstellen» wählen, nicht «Einfache Aufgabe».

| Bereich | Einstellung |
| --- | --- |
| Allgemein | Name: `ABW Tool – Produktivserver` |
| Benutzerkonto | Das Konto, das Zugriff auf Projekt, lokale Datenbank und Backup-Freigabe hat |
| Sicherheit | «Unabhängig von der Benutzeranmeldung ausführen» |
| Netzwerkanmeldung | «Kennwort nicht speichern … nur Zugriff auf lokale Computerressourcen» **nicht** auswählen, wenn Netzwerk-Backups verwendet werden |
| Trigger | «Beim Start» mit Verzögerung von 1 Minute |
| Aktion | «Programm starten», siehe Felder unten |
| Bedingungen | «Nur starten, falls Computer im Netzbetrieb ausgeführt wird» deaktivieren; «Beenden, wenn der Computer in den Akkubetrieb wechselt» ebenfalls deaktivieren |
| Einstellungen | «Ausführung der Aufgabe bei Bedarf zulassen» aktivieren |
| Einstellungen | Bei Fehler jede Minute neu starten, beispielsweise bis zu 10 Versuche |
| Einstellungen | «Aufgabe beenden, falls Ausführung länger als …» **deaktivieren** |
| Einstellungen | Falls die Aufgabe bereits ausgeführt wird: «Keine neue Instanz starten» |

Für einen beispielhaften Projektordner `C:\ABW\abw_tool` die Aktion so anlegen
(den Pfad überall durch den tatsächlichen lokalen Projektpfad ersetzen):

- **Programm/Skript:** `C:\Windows\System32\cmd.exe`
- **Argumente hinzufügen:** `/d /s /c ""C:\ABW\abw_tool\START_PRODUCTION.bat""`
- **Starten in:** `C:\ABW\abw_tool` (ohne Anführungszeichen)

Beim Speichern kann Windows das Kennwort des gewählten Kontos verlangen.
Es gehört nur in den Windows-Dialog, nicht in die Batchdatei oder ins Repository.
Bei einer Kennwortänderung auch die Aufgabe aktualisieren. Falls die
Organisation die Ausführung ohne Anmeldung für dieses Konto sperrt, muss die IT
ein passendes Konto oder die benötigte Berechtigung bereitstellen.
«Mit höchsten Privilegien» ist für die App grundsätzlich nicht nötig.

In den Windows-Energieeinstellungen den automatischen Standby im Netzbetrieb
deaktivieren und das Verhalten beim Zuklappen prüfen, falls der Laptop geschlossen
betrieben wird. Eine gesperrte Sitzung ist in Ordnung; ein schlafender Laptop
stellt die App nicht bereit.

## Prüfen

1. Alle manuell gestarteten Server beenden.
2. Die neue Aufgabe über «Ausführen» starten.
3. Die App von einem zweiten Gerät im internen Netz öffnen; auch Anmeldung und
   Lesen der Daten prüfen. Bei konfiguriertem Backup kontrollieren, ob eine neue
   Sicherung im Netzwerkordner erscheint.
4. Den HR-Laptop neu starten und **ohne Anmeldung am HR-Laptop** von einem zweiten
   Gerät erneut prüfen. Wegen der Verzögerung etwas mehr als eine Minute warten.
5. Bei Problemen `logs\production.log`, «Letztes Ausführungsergebnis» und den
   Verlauf der Aufgabe prüfen.

Während der Server läuft, bleibt die Aufgabe im Zustand «Wird ausgeführt».
Der Code `0x41301` bedeutet in diesem Fall, dass die Aufgabe noch läuft.

## Updates und manueller Betrieb

Bei automatischem Betrieb die Aufgabe in der Aufgabenplanung zuerst **beenden**,
danach das Update durchführen und dieselbe Aufgabe wieder **ausführen**.
Bei längerer Wartung die Aufgabe zusätzlich deaktivieren und danach wieder
aktivieren. Nicht parallel `START_APP.bat`, `START_SERVER.bat` oder
`START_PRODUCTION.bat` manuell starten. «Keine neue Instanz» schützt nur vor
Doppelstarts derselben Windows-Aufgabe, nicht vor zusätzlichen manuellen Starts.

Der automatische Neustart greift bei einem Fehlerende mit Exit-Code ungleich
null. Er erkennt keinen hängenden Server. Der Starter setzt den Produktivmodus
und deaktiviert den Entwicklungsmodus auch dann, wenn in der `.env` etwas anderes
steht. Die übrige lokale Konfiguration einschliesslich Datenbank und
Backup-Ziel wird wie bisher übernommen.

## Kontrolle aus dem Homeoffice

Diese Einrichtung sorgt für den Wiederanlauf nach Windows-Neustarts. Sie schafft
noch keinen Fernzugriff und keine von aussen sichtbare Statusanzeige.
Dafür wäre separat ein Lebenszeichen an einen aus dem Homeoffice erreichbaren,
freigegebenen Dienst möglich. Es sollte erst gesendet werden, nachdem eine lokale
HTTP-Prüfung der App erfolgreich war. Die Gegenstelle müsste ausbleibende
Lebenszeichen erkennen. Ein lokal erfolgreicher Aufruf beweist dabei noch nicht
die Erreichbarkeit von anderen Geräten im internen Netz.
