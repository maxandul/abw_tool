import HelpSection from './HelpSection';

export default function CaptureAccuracyHelp() {
  return (
    <HelpSection id="erfassungsgenauigkeit" title="Wie genau muss ich erfassen?">
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">
        <p>Erfasse deine Tätigkeiten so, dass die Zeitanteile pro Halbtag ungefähr deiner tatsächlichen Arbeit entsprechen. Häufige kurze Wechsel am gleichen Aufenthaltsort – beispielsweise zwischen alleiniger Arbeit und Telefonaten – kannst du als zusammenhängende Blöcke erfassen.</p>
        <p><strong>Beispiel:</strong> Du arbeitest von 08:00 bis 12:00 Uhr am Büroarbeitsplatz und telefonierst dabei insgesamt ungefähr eine Stunde. Erfasse beispielsweise:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>08:00–11:00 Uhr: <strong>Allein arbeiten</strong></li>
          <li>11:00–12:00 Uhr: <strong>Online-Meeting / Telefonat</strong></li>
        </ul>
        <p>Wähle bei beiden Einträgen den Aufenthaltsort «Am untersuchten Standort» und die Raumnutzung «Am Büroarbeitsplatz». Die Telefonate müssen nicht tatsächlich zwischen 11:00 und 12:00 Uhr stattgefunden haben.</p>
        <p>Längere zusammenhängende Tätigkeiten wie eine geplante Besprechung sowie Wechsel des Aufenthaltsorts oder des genutzten Raums erfasst du möglichst zu den tatsächlichen Zeiten. Diese Zeiten sind für die Einschätzung der Arbeitsplatz- und Raumbelegung wichtig.</p>
      </div>
    </HelpSection>
  );
}
