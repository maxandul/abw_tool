# Produktiv- und Read-only-Modus

Das Projekt bleibt auf beiden Laptops identisch. Die produktive Datenbank liegt
weiterhin ausschliesslich lokal auf dem Server-Laptop. Der Netzwerkordner enthält
nur konsistente, versionierte Backups.

## Einmalige Konfiguration

Auf beiden Geräten im Projektordner eine lokale `.env` anlegen. Als Vorlage dient
`.env.example`. Für den Netzwerkpfad möglichst einen UNC-Pfad verwenden, damit er
auf beiden Geräten identisch ist:

```env
BACKUP_TARGET=\\firmenserver\freigabe\abw_tool_backups
BACKUP_SOURCE=\\firmenserver\freigabe\abw_tool_backups
BACKUP_INTERVAL_MINUTES=60
BACKUP_KEEP=30
```

`BACKUP_TARGET` wird vom Produktivmodus verwendet. `BACKUP_SOURCE` wird vom
Read-only-Modus verwendet. Falls der persönliche Laptop nur Leserechte auf dem
Backup-Ordner hat, genügt dort `BACKUP_SOURCE`.

Der Netzwerkordner enthält personenbezogene Rohdaten und muss entsprechend
restriktiv berechtigt sein.

## Start

`START_APP.bat` doppelklicken und den gewünschten Modus wählen:

- **Produktivmodus:** lokale Datenbank, normale Schreibzugriffe, automatische
  Backups sofort beim Start und danach im konfigurierten Intervall.
- **Read-only-Modus:** neustes vollständiges Backup aus `BACKUP_SOURCE` wird nach
  `%LOCALAPPDATA%\ABWTool\readonly\readonly_snapshot.db` kopiert, geprüft und
  ausschliesslich lesend geöffnet.

Im Read-only-Modus werden keine Migrationen oder Seeds ausgeführt. Sämtliche
schreibenden API-Aufrufe sind serverseitig gesperrt. Login, Navigation,
Auswertungen und HTML-Exporte bleiben verfügbar. Am unteren Fensterrand wird der
Datenstand des Snapshots angezeigt.

`START_SERVER.bat` bleibt aus Kompatibilitätsgründen erhalten und öffnet dieselbe
Modusauswahl.

## Backups

Der Produktivmodus erstellt zunächst lokal über die SQLite-Backup-API einen
konsistenten Snapshot. Erst der fertige Snapshot wird in eine temporäre Datei im
Netzwerkordner kopiert, per SHA-256 geprüft und danach unter seinem endgültigen
Namen veröffentlicht. Unvollständige Dateien werden deshalb vom Read-only-Modus
nicht ausgewählt.

Zusätzlich kann mit `backup.bat` jederzeit manuell ein konsistentes Backup erstellt
werden. `BACKUP_KEEP` bestimmt die Anzahl aufbewahrter Versionen.

## Grenzen

Der Read-only-Modus stellt den letzten gesicherten Datenstand bereit. Er ersetzt
den produktiven Server nicht: Wenn der Server-Laptop oder die produktive App
ausfällt, können Teilnehmende keine neuen Eingaben erfassen.
