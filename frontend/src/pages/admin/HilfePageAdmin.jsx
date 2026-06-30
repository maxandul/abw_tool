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
        <P>Pro Erhebung wird ein Fortschrittsbalken angezeigt: Erfasste Stunden vs. Erwartete Stunden (Summe der Beschäftigungsgrade × Arbeitstage × 8,4h). Teilzeitkräfte werden so anteilig gewichtet (z. B. zählt ein 80%-Pensum als 0,8).</P>
        <P>Aktionen direkt aus dem Dashboard: <strong>Abschliessen</strong> (sperrt neue Einträge), <strong>Wieder öffnen</strong>, <strong>Archivieren</strong> (nur möglich wenn abgeschlossen).</P>
      </Section>

      <Section title="Erhebungen verwalten">
        <P>Unter <em>Erhebungen</em> kannst du Erhebungen erstellen, bearbeiten und deren Lebenszyklus steuern:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Neue Erhebung:</strong> Name und Zeitraum (von/bis).</Li>
          <Li><strong>Link zur App:</strong> Oben auf der Seite den stabilen Link mit PC-Namen kopieren und an Teilnehmende senden (nicht die IP-Adresse).</Li>
          <Li><strong>Abschliessen / Wieder öffnen:</strong> Steuert, ob Teilnehmer noch Einträge erfassen können.</Li>
          <Li><strong>Archivieren:</strong> Erhebung für immer deaktivieren (nur wenn abgeschlossen). Erfordert Bestätigung.</Li>
        </ul>
      </Section>

      <Section title="Teilnehmer verwalten">
        <P>Teilnehmer werden pro Erhebung erfasst – per <strong>CSV-Import</strong> (Massenerfassung) oder <strong>manuell</strong>.</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Temporärer PIN:</strong> Für alle Teilnehmer immer <strong>0000</strong> (neue Accounts und PIN-Reset). Beim ersten Login wählen sie einen eigenen PIN.</Li>
          <Li><strong>Link zur App:</strong> Ein gemeinsamer Link für alle Erhebungen (z. B. <code className="text-xs bg-slate-100 px-1 rounded">http://PCNAME:5000</code>). Nach dem Login sehen Teilnehmende ihre Erhebungen als Tabs in der Titelleiste.</Li>
          <Li><strong>CSV-Import:</strong> SAP-Export als CSV (Semikolon, UTF-8). Spalten: E-Mail, Vorname, Nachname, Funktion, Organisationseinheit, Beschäftigungsgrad (%).</Li>
          <Li><strong>Erneuter Import:</strong> Bereits erfasste Teilnehmer (gleiche E-Mail) werden aktualisiert.</Li>
          <Li><strong>Manuell / Bearbeiten / PIN reset / Entfernen:</strong> Einzelpersonen erfassen, Attribute anpassen, PIN auf 0000 zurücksetzen oder aus Erhebung entfernen.</Li>
        </ul>
      </Section>

      <Section title="Tätigkeiten">
        <P>Tätigkeiten definieren die Arten, die Teilnehmer im Kalender auswählen können. Sie sind in vier Gruppen gegliedert:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Einzelarbeit:</strong> Call- und stille Einzelarbeit-Varianten (Grüntöne im Kalender).</Li>
          <Li><strong>Zu zweit/zu dritt (physisch):</strong> Störung erlaubt/ungestört × geplant/ungeplant (Blautöne).</Li>
          <Li><strong>In Gruppen (4+, physisch):</strong> wie zu zweit/zu dritt (Rottöne).</Li>
          <Li><strong>Extern:</strong> Teilzeit/frei, Homeoffice, Mobil/anderer Standort.</Li>
        </ul>
        <P>Pro Tätigkeit kannst du Name, Farbe (Gruppen-Palette oder eigene Farbe per «+»), Beschreibung und Sortierung anpassen. Im Teilnehmer-Kalender erscheinen die Tätigkeiten gruppiert nach diesen Gruppen.</P>
        <P>Inaktive Tätigkeiten können nicht mehr erfasst werden; bestehende Einträge bleiben erhalten.</P>
      </Section>

      <Section title="Auswertung">
        <P>Wähle eine oder mehrere Erhebungen aus dem Dropdown. Der Vergleichsmodus ermöglicht das Überlagern mehrerer Erhebungen per Chip-Auswahl.</P>
        <P>In die Auswertung fliessen <strong>nur eingereichte</strong> Teilnehmer ein (Status «Eingereicht» oder «Abgeschlossen»). Wer noch nicht eingereicht oder die Erhebung zur Bearbeitung entsperrt hat, wird nicht berücksichtigt.</P>
        <P>Die Karte <strong>Stichprobe</strong> fasst die Datenbasis zusammen: wie viele von wie vielen eingereicht haben, FTE-Summe und erfasste Zeit der Eingereichten sowie deren Vollständigkeit (erfasste vs. erwartete Stunden). Eingereichte Teilnehmer unter 85% Vollständigkeit werden separat ausgewiesen und sind anklickbar. Die Werte berücksichtigen den Teilnehmer-Filter.</P>
        <P>Die Auswertung zeigt Lastprofile, Bedarf nach Tätigkeit sowie Zeitanteile pro Tätigkeit und Tätigkeitsgruppe.</P>
        <P>Der <strong>HTML-Export</strong> ist eine eigenständige, anonyme Datei (keine Namen oder E-Mail-Adressen) der aktuell gewählten Erhebung(en). Sie ist interaktiv: Empfänger können darin selbst nach Teilnehmer-Attributen filtern und Lastprofile für verschiedene Tätigkeiten erstellen – ganz ohne Server. Der beim Export aktive Filter ist als Ausgangszustand voreingestellt.</P>
      </Section>

      <Section title="Administratoren verwalten">
        <P>Unter <em>Admins</em> siehst du alle bestehenden Admin-Accounts und kannst neue anlegen oder PINs zurücksetzen.</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Neuer Admin:</strong> E-Mail-Adresse eingeben – ein temporärer PIN wird generiert und einmalig angezeigt. Die Person gibt ihn beim ersten Login ein und wählt danach einen eigenen PIN.</Li>
          <Li><strong>PIN zurücksetzen:</strong> Generiert einen neuen temporären PIN, der der Person manuell mitgeteilt werden muss.</Li>
          <Li><strong>Löschen:</strong> Entfernt einen Admin-Account (nicht möglich für den eigenen Account oder den letzten verbleibenden Admin).</Li>
        </ul>
      </Section>
    </div>
  );
}
