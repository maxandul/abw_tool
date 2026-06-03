export default function HilfePageAdmin() {
  const Section = ({ title, children }) => (
    <section className="card space-y-3">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );

  const P = ({ children }) => <p className="text-sm text-slate-600 leading-relaxed">{children}</p>;
  const Li = ({ children }) => <li className="text-sm text-slate-600 leading-relaxed">{children}</li>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Hilfe – Adminbereich</h1>
      <p className="text-sm text-slate-500">Hier findest du eine Übersicht über alle Funktionen des Adminbereichs.</p>

      <Section title="Dashboard">
        <P>Das Dashboard gibt dir einen schnellen Überblick über alle Erhebungen mit folgenden KPIs:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Erhebungen total:</strong> Alle aktiven Erhebungen.</Li>
          <Li><strong>Offen:</strong> Erhebungen, in denen noch Einträge erfasst werden können.</Li>
          <Li><strong>Abgeschlossen:</strong> Erhebungen, die gesperrt, aber noch nicht archiviert sind.</Li>
        </ul>
        <P>Pro Erhebung wird ein Fortschrittsbalken angezeigt: Erfasste Stunden vs. Erwartete Stunden (Teilnehmerzahl × Arbeitstage × 8,4h).</P>
        <P>Aktionen direkt aus dem Dashboard: <strong>Abschliessen</strong> (sperrt neue Einträge), <strong>Wieder öffnen</strong>, <strong>Archivieren</strong> (nur möglich wenn abgeschlossen).</P>
      </Section>

      <Section title="Erhebungen verwalten">
        <P>Unter <em>Erhebungen</em> kannst du Erhebungen erstellen, bearbeiten und deren Lebenszyklus steuern:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Neue Erhebung:</strong> Name, Zeitraum (von/bis), Sharing-Ratio und optionaler Standort-Hinweis.</Li>
          <Li><strong>Einladungslink kopieren:</strong> Einmaligen Registrierungslink für Teilnehmer erzeugen und teilen.</Li>
          <Li><strong>Link zurücksetzen:</strong> Alten Link ungültig machen und neuen generieren.</Li>
          <Li><strong>Abschliessen / Wieder öffnen:</strong> Steuert, ob Teilnehmer noch Einträge erfassen können.</Li>
          <Li><strong>Archivieren:</strong> Erhebung für immer deaktivieren (nur wenn abgeschlossen). Erfordert Bestätigung.</Li>
        </ul>
      </Section>

      <Section title="Teilnehmer verwalten">
        <P>Pro Erhebung siehst du alle Teilnehmer mit Status (Offen / In Bearbeitung / Eingereicht / Abgeschlossen) und der Anzahl erfasster Stunden.</P>
        <P>Du kannst Teilnehmer manuell hinzufügen (sie erhalten automatisch einen temporären PIN) oder den PIN eines Teilnehmers zurücksetzen.</P>
        <P>Manuelle Teilnehmer werden direkt der Erhebung zugewiesen – beim nächsten Login landen sie direkt auf dem Kalender dieser Erhebung.</P>
      </Section>

      <Section title="Kategorien">
        <P>Kategorien definieren die Tätigkeitsarten, die Teilnehmer im Kalender auswählen können.</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Name + Farbe:</strong> Identifikation im Kalender.</Li>
          <Li><strong>Beschreibung:</strong> Erklärender Text, der Teilnehmern beim Erfassen angezeigt wird.</Li>
          <Li><strong>Vertraulichkeit:</strong> Klassifiziert die Kategorie nach Offenheit (Offen / Intern / Vertraulich). Wird im Kalender als Gruppierung verwendet.</Li>
          <Li><strong>Gruppengrösse:</strong> Gibt an, für welche Gruppengrösse diese Tätigkeit typisch ist (Allein / Klein / Mittel / Gross).</Li>
          <Li><strong>Raumtypen:</strong> Mehrere Raumtypen pro Kategorie möglich.</Li>
          <Li><strong>Deaktivieren / Reaktivieren:</strong> Inaktive Kategorien können nicht mehr erfasst werden, bestehende Einträge bleiben erhalten.</Li>
        </ul>
        <P>Wenn eine Kategorie in bestehenden Einträgen verwendet wird, erhältst du beim Bearbeiten die Wahl: bestehende Einträge überschreiben oder neue Einträge mit der geänderten Kategorie erfassen.</P>
      </Section>

      <Section title="Raumtypen">
        <P>Raumtypen beschreiben die Raumform, die für eine Kategorie passend ist (z. B. Besprechungsraum, Open Space). Sie sind optional und dienen der Auswertung.</P>
        <P>Raumtypen können deaktiviert und reaktiviert werden.</P>
      </Section>

      <Section title="Auswertung">
        <P>Wähle eine oder mehrere Erhebungen aus dem Dropdown. Der aktive Vergleichsmodus ermöglicht das Überlagern mehrerer Erhebungen per Chip-Auswahl.</P>
        <P>Die Auswertung zeigt Zeitanteile pro Kategorie sowie tagesweise Verteilungen. Abgeschlossene und offene Erhebungen können verglichen werden.</P>
      </Section>
    </div>
  );
}
