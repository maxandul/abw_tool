# Frontend – Tätigkeitserhebung

React-Frontend (Vite + Tailwind CSS) für das Tätigkeitserhebungs-Tool. Die vollständige Projekt- und Deployment-Dokumentation steht im [Haupt-README](../README.md).

## Entwicklung

```
npm install
npm run dev
```

Der Dev-Server läuft mit Hot-Reload und proxyt API-Aufrufe an das Flask-Backend auf `http://localhost:5000`.

## Produktiv-Build

Nicht direkt hier bauen – stattdessen im Projekt-Root:

```
build.bat
```

Das Skript baut das Frontend (`vite build`) und kopiert das Ergebnis nach `backend/static/`, von wo Flask es ausliefert. Veraltete Build-Artefakte werden dabei automatisch entfernt.

## Struktur

- `src/pages/admin/` – Admin-Bereich (Dashboard, Kategorien, Erhebungen, Teilnehmer, Auswertung)
- `src/pages/teilnehmer/` – Teilnehmer-Bereich (Kalender-Erfassung, Hilfe)
- `src/api/` – HTTP-Clients für die Backend-Endpunkte
- `src/utils/` – geteilte Helfer (z. B. Tätigkeitsgruppen-Logik)
