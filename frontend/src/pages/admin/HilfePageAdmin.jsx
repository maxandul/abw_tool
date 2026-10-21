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
        <P>Pro Erhebung wird ein Fortschrittsbalken angezeigt: Erfasste Stunden vs. Erwartete Stunden (Anzahl Teilnehmer × Arbeitstage × 8,4h). Das Soll ist für alle gleich – auch Teilzeitkräfte erfassen die ganze Woche, indem sie ihre regulär freie Zeit als Tätigkeit «Teilzeit» eintragen. Übererfassung Einzelner wird je Teilnehmer auf 100% des Solls begrenzt, damit Lücken anderer sichtbar bleiben.</P>
        <P>Aktionen direkt aus dem Dashboard: <strong>Abschliessen</strong> (sperrt neue Einträge), <strong>Wieder öffnen</strong>, <strong>Archivieren</strong> (nur möglich wenn abgeschlossen).</P>
      </Section>

      <Section title="Erhebungen verwalten">
        <P>Unter <em>Erhebungen</em> kannst du Erhebungen erstellen, bearbeiten und deren Lebenszyklus steuern:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Neue Erhebung:</strong> Name und Zeitraum (von/bis). Lege pro untersuchtem Standort eine eigene Erhebung an und nenne den Standort im Namen. Für neue Einträge stehen die fünf festen Grundtypen bereit.</Li>
          <Li><strong>Link zur App:</strong> Oben auf der Seite den stabilen Link mit PC-Namen kopieren und an Teilnehmende senden (nicht die IP-Adresse).</Li>
          <Li><strong>Abschliessen / Wieder öffnen:</strong> Steuert, ob Teilnehmer noch Einträge erfassen können.</Li>
          <Li><strong>Archivieren:</strong> Deaktiviert eine abgeschlossene Erhebung nach Bestätigung. Sie bleibt in der Auswertung auswählbar.</Li>
        </ul>
      </Section>

      <Section title="Teilnehmer verwalten">
        <P>Teilnehmer werden pro Erhebung erfasst – per <strong>CSV-Import</strong> (Massenerfassung) oder <strong>manuell</strong>.</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Temporärer PIN:</strong> Für alle Teilnehmer immer <strong>0000</strong> (neue Accounts und PIN-Reset). Beim ersten Login wählen sie einen eigenen PIN.</Li>
          <Li><strong>Link zur App:</strong> Ein gemeinsamer Link für alle Erhebungen (z. B. <code className="text-xs bg-slate-100 px-1 rounded">http://PCNAME:5000</code>). Nach dem Login sehen Teilnehmende ihre Erhebungen als Tabs in der Titelleiste.</Li>
          <Li><strong>CSV-Import:</strong> SAP-Export als CSV (Semikolon, UTF-8). Spalten: E-Mail, Vorname, Nachname, Funktion, Organisationseinheit, Beschäftigungsgrad (%).</Li>
          <Li><strong>Erneuter Import:</strong> Bereits erfasste Teilnehmer (gleiche E-Mail) werden aktualisiert.</Li>
          <Li><strong>Manuell / Bearbeiten / PIN reset / Entfernen:</strong> Einzelpersonen erfassen, Attribute anpassen, PIN auf 0000 zurücksetzen oder aus der Erhebung entfernen. Beim Entfernen bleiben die Einträge erhalten.</Li>
        </ul>
      </Section>

      <Section title="Einträge für Teilnehmende erfassen und einreichen">
        <P>Öffne in der Teilnehmerliste über <strong>Einträge</strong> den Kalender der gewünschten Person. Admin und Teilnehmende verwenden dasselbe Formular. Wähle die Woche über die Pfeile oder das Dropdown und markiere ein Zeitfenster im Kalender.</P>
        <P>Im Formular wählst du Datum, Uhrzeiten und Tätigkeit. Unter <strong>Eigener Name (optional)</strong> kannst du einen Titel mit maximal 100 Zeichen vergeben. Die Folgefragen erscheinen schrittweise. Der Name erscheint im Kalender und wird beim Kopieren übernommen; die Tätigkeit bleibt für die Auswertung massgebend.</P>
        <P>Über einen Kalenderblock erhältst du per Maus oder Tastaturfokus die Details. Öffne ihn zum Bearbeiten oder Löschen. Mit <strong>Kopieren</strong> oben im Formular übernimmst du einen gespeicherten Eintrag der aktuellen Erfassung; passe Datum und Uhrzeiten vor dem Speichern an.</P>
        <P><strong>Benannte Einträge wiederverwenden:</strong> Markiere einen neuen Zeitslot und wähle «Aus benanntem Eintrag übernehmen (optional)». Zur Auswahl stehen nur benannte Einträge der geöffneten Person in dieser Erhebung. Name, Tätigkeit und Angaben werden übernommen, Datum und Uhrzeiten bleiben beim neuen Zeitslot. Identische Varianten erscheinen einmal; unterschiedliche Angaben unter demselben Namen bleiben getrennt auswählbar. Speichere den neuen Eintrag nach der Prüfung.</P>
        <P>Als Admin kannst du Einträge auch nach der Einreichung sowie in abgeschlossenen Erhebungen bearbeiten. In der Teilnehmerliste kannst du über <strong>Einreichen</strong> im Namen einer Person einreichen. Prüfe die Hinweise zu möglichen Lücken und bestätige die Einreichung. Solange die Erhebung offen ist, kann die Person ihre Einreichung selbst wieder entsperren.</P>
      </Section>

      <Section title="Tätigkeiten und räumliche Planung">
        <P>Unter <strong>Tätigkeiten und Erfassung</strong> findest du die fünf festen Grundtypen: Allein arbeiten, Online-Meeting / Telefonat, Besprechung / Zusammenarbeit vor Ort, Arbeitsfreie Zeit wegen Teilzeit und Andere Abwesenheit. Historische Tätigkeiten sind separat einsehbar.</P>
        <P><strong>Allein arbeiten:</strong> Aufgaben ohne gleichzeitigen Austausch (z. B. lesen, schreiben oder E-Mails bearbeiten).</P>
        <P><strong>Online-Meeting / Telefonat:</strong> Du nimmst online oder telefonisch an einer Besprechung teil, ohne gleichzeitig Austausch mit Personen im selben Raum. Es wird keine Gruppengrösse abgefragt.</P>
        <P><strong>Besprechung / Zusammenarbeit vor Ort:</strong> Gemeinsamer Austausch oder gemeinsame Arbeit mit Personen im selben Raum. Nach dem Aufenthaltsort werden Gruppengrösse (2–4, 5–8, 9–12 oder 13+ einschliesslich der erfassenden Person), die optionale Hybrid-Checkbox und der Personenkreis abgefragt. Online zugeschaltete und unbeteiligte Personen zählen nicht zur Gruppengrösse.</P>
        <P><strong>Ort und Raum:</strong> Bei allen drei Arbeitstätigkeiten wird der eigene Aufenthaltsort erfasst. Nur am untersuchten Standort folgt die Frage nach dem tatsächlich genutzten Platz: Büroarbeitsplatz, Rückzugs- / Telefonraum, Besprechungsraum oder offener Gemeinschaftsbereich. Ein hypothetischer Bedarf an geschlossenen Räumen wird nicht abgefragt.</P>
        <P><strong>Abwesenheit:</strong> Regulär freie Zeit wegen Teilzeit und andere Abwesenheiten werden direkt als eigene Tätigkeit gewählt. Dafür sind keine Orts- oder Raumangaben nötig. Pausen bleiben frei.</P>
        <P><strong>Historische Daten:</strong> Bestehende Einträge behalten ihre ursprünglichen Angaben. Fehlende Raumangaben werden nicht nachträglich angenommen. Eigene Namen ändern die Auswertungskategorien nicht; zusätzliche Farbvarianten für Merkmalskombinationen gibt es nicht.</P>
      </Section>

      <Section title="Auswertung">
        <P>Wähle zunächst eine Erhebung im Dropdown. Über «Mehrere Erhebungen zusammenfassen» kannst du weitere Erhebungen per Schaltfläche hinzufügen oder entfernen. Die ausgewählten Erhebungen werden gemeinsam ausgewertet. Mit dem Teilnehmer-Filter grenzt du nach Funktion, Organisationseinheit oder Beschäftigungsgrad ein.</P>
        <P>In die Auswertung fliessen <strong>nur eingereichte</strong> Teilnehmer ein (Status «Eingereicht» oder «Abgeschlossen»). Wer noch nicht eingereicht oder die Erhebung zur Bearbeitung entsperrt hat, wird nicht berücksichtigt.</P>
        <P>Die Karte <strong>Stichprobe</strong> fasst die Datenbasis zusammen: wie viele von wie vielen eingereicht haben, FTE-Summe und erfasste Zeit der Eingereichten sowie deren Vollständigkeit (erfasste vs. erwartete Stunden). Übererfassung einzelner Teilnehmer wird dabei auf 100% des jeweiligen Solls begrenzt, damit Lücken anderer nicht überdeckt werden. Eingereichte Teilnehmer unter 85% Vollständigkeit werden separat ausgewiesen und sind anklickbar. Die Werte berücksichtigen den Teilnehmer-Filter.</P>
        <P>«Tätigkeiten im Tagesverlauf» zählt die ausgewählten Tätigkeiten an allen erfassten Orten; dafür stehen auch Tätigkeits- und Merkmal-Filter bereit. «Arbeitsplätze und Räume» zeigt separate Planungsprofile zur Standortanwesenheit, tatsächlichen Arbeitsplatz- und Raumnutzung. Die «Anteilsübersicht» zeigt Zeitanteile mit und ohne Abwesenheiten. Maxima werden je konkretem Tag berechnet, danach je Wochentag zusammengefasst. Der durchschnittliche Tag enthält auch unbelegte Zeitfenster; vollständig fehlende Personentage werden ausgeschlossen. Die Schätzannahmen stehen direkt bei der Raumansicht. Zeitgleiche interne Besprechungen derselben Erhebung und Grössenklasse werden näherungsweise zusammengefasst. Gruppen mit Gästen können überschätzt werden. Ansichten zum benötigten geschlossenen Raum und zu Rückzugsgründen beruhen nur auf vorhandenen früheren Angaben: Die aktuelle Erfassung erhebt diese nicht mehr. Leere Werte bedeuten hier keinen nachgewiesenen fehlenden Bedarf.</P>
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
