import { useEffect, useState } from "react";
import { getKontakt } from "../../api/auth";
import { getKategorien } from "../../api/teilnehmer";
import { groupKategorien } from "../../utils/taetigkeiten";

export default function HilfePageTn() {
  const [admins, setAdmins] = useState([]);
  const [kategorien, setKategorien] = useState([]);

  useEffect(() => {
    getKontakt().then(({ data }) => {
      if (data?.admins) setAdmins(data.admins);
    });
    getKategorien().then(({ data }) => {
      if (data) setKategorien(data.filter(k => k.schema_version === 2));
    });
  }, []);

  const taetigkeitsGruppen = groupKategorien(kategorien);

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
      <h1 className="text-2xl font-bold text-slate-800">Hilfe – Tätigkeitserhebung</h1>
      <p className="text-sm text-slate-500">Hier erfährst du, wie du deine Tätigkeiten erfassen und einreichen kannst.</p>

      <Section title="Dashboard">
        <P>Auf dem Dashboard siehst du alle Erhebungen, an denen du teilnimmst. Pro Erhebung siehst du:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Status:</strong> Offen oder In Bearbeitung (noch erfassbar), Eingereicht, Abgeschlossen.</Li>
          <Li><strong>Fortschritt:</strong> Balken mit erfasster Zeit gegenüber dem Soll (Arbeitstage × 8,4 h) und dem Prozentwert deiner Vollständigkeit.</Li>
          <Li><strong>Zeitanteile:</strong> Balkendiagramm deiner bisher erfassten Tätigkeitskategorien.</Li>
          <Li><strong>Tätigkeit erfassen:</strong> Öffnet den Kalender dieser Erhebung.</Li>
          <Li><strong>Einreichen:</strong> Reicht deine Einträge zur Auswertung ein.</Li>
          <Li><strong>Änderung vornehmen:</strong> Entsperrt eingereichte Einträge, falls du noch etwas korrigieren möchtest.</Li>
        </ul>
      </Section>

      <Section title="Kalender – Einträge erfassen">
        <P>Der Kalender zeigt jeweils eine Woche von Montag bis Freitag. Mit «Vorherige Woche», «Nächste Woche» oder der Wochenauswahl wechselst du die Ansicht. Tage ausserhalb des Erhebungszeitraums sind ausgegraut und nicht bearbeitbar.</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Klicken und Ziehen:</strong> Halte die Maustaste auf einem freien Zeitslot gedrückt und ziehe nach unten, um eine Zeitspanne auszuwählen. Der blaue Bereich zeigt dir Startzeit, Endzeit und Dauer.</Li>
          <Li><strong>Tätigkeit wählen:</strong> Wähle im Dropdown die passende Tätigkeit aus fünf Grundtypen. Die Beschreibung darunter hilft dir bei der Zuordnung. Entscheidend ist, wie du tatsächlich gearbeitet hast.</Li>
          <Li><strong>Alles ausser Pausen:</strong> Erfasse alle Tätigkeiten deines Arbeitstags lückenlos. Nur (Mittags-)Pausen lässt du frei.</Li>
          <Li><strong>Teilzeit &amp; Abwesenheit:</strong> Regulär freie Zeit bei Teilzeitpensum trägst du als <strong>Arbeitsfreie Zeit wegen Teilzeit</strong> ein. Für Ferien, Krankheit oder Feiertage wählst du <strong>Andere Abwesenheit</strong>. So ist deine Woche vollständig.</Li>
          <Li><strong>Eintrag bearbeiten / löschen:</strong> Klicke auf einen bestehenden farbigen Block, um ihn zu bearbeiten oder zu löschen.</Li>
        </ul>
      </Section>

      {taetigkeitsGruppen.length > 0 && (
        <Section title="Übersicht der Tätigkeiten">
          <P>Hier findest du die fünf Grundtypen für neue Einträge mit ihren Beschreibungen. Im Formular wählst du sie über ein Dropdown aus.</P>
          {taetigkeitsGruppen.map(g => (
            <div key={g.key} className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-700 mt-3">{g.label}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="table-th w-1/3">Tätigkeit</th>
                    <th className="table-th">Beschreibung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.items.map(k => (
                    <tr key={k.id} className="align-top">
                      <td className="table-td">
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: k.farbe ?? "#ccc" }} />
                          <span className="font-medium text-slate-700">{k.name}</span>
                        </span>
                      </td>
                      <td className="table-td text-slate-600">{k.beschreibung || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Section>
      )}

      <Section title="Das Erfassungsformular Schritt für Schritt">
        <P><strong>Datum und Uhrzeit:</strong> Prüfe Datum, Von und Bis. Die Uhrzeiten werden in Viertelstunden gewählt. Einträge dürfen sich zeitlich nicht überschneiden.</P>
        <P><strong>Eigener Name (optional):</strong> Klappe das Feld auf und vergib bei Bedarf einen Namen, beispielsweise «Teamsitzung» (maximal 100 Zeichen). Er erscheint als Titel im Kalender. Die gewählte Tätigkeit bleibt für die Auswertung massgebend.</P>
        <P><strong>Aufenthaltsort:</strong> Wähle, wo du selbst warst: am untersuchten Standort, im Homeoffice, an einem anderen VD-Standort oder anderswo / unterwegs. Der untersuchte Standort gehört zur ausgewählten Erhebung.</P>
        <P><strong>Allein arbeiten oder Online-Meeting / Telefonat:</strong> Es wird keine Gruppengrösse abgefragt. Wähle Online-Meeting / Telefonat, wenn du online oder telefonisch teilnimmst, ohne gleichzeitig mit Personen im selben Raum zusammenzuarbeiten. Andere Personen, die unabhängig von dir im Büro arbeiten, ändern diese Zuordnung nicht.</P>
        <P><strong>Besprechung / Zusammenarbeit vor Ort:</strong> Wähle die Zahl der beteiligten Personen im selben Raum, dich eingeschlossen: 2–4, 5–8, 9–12 oder 13 und mehr. Eine Schätzung genügt. Unbeteiligte Personen im Büro und online zugeschaltete Personen zählen nicht mit.</P>
        <P><strong>Hybrid und Personenkreis:</strong> Nach der Gruppengrösse kannst du «An der Besprechung nehmen online zugeschaltete Personen teil (hybrid)» ankreuzen. Wähle anschliessend, ob nur Personen deines Standorts oder auch Personen anderer Standorte / externe Gäste mit dir im Raum waren.</P>
        <P><strong>Tatsächliche Raumnutzung:</strong> Nur am untersuchten Standort wählst du den tatsächlich genutzten Platz: Büroarbeitsplatz, Rückzugs- / Telefonraum, Besprechungsraum oder offener Gemeinschaftsbereich. Ein hypothetischer Raumbedarf wird nicht abgefragt.</P>
        <P><strong>Schrittweise Eingabe:</strong> Folgefragen erscheinen, sobald die vorherigen Pflichtangaben beantwortet sind. Bereits gespeicherte Antworten sind beim Bearbeiten sichtbar. Für Abwesenheiten sind keine weiteren Angaben zu Ort oder Raum nötig. Prüfe die Zusammenfassung und klicke auf <strong>Speichern</strong>.</P>
      </Section>

      <Section title="Einträge erkennen, bearbeiten und kopieren">
        <P><strong>Farben und Symbole:</strong> Die Farbe kennzeichnet die Tätigkeit. Ein Symbol unterstützt die Orientierung; hybride Vor-Ort-Besprechungen tragen zusätzlich den Hinweis «Hybrid». Ein eigener Name ersetzt den Kalendertitel, nicht die zugeordnete Tätigkeit.</P>
        <P><strong>Details auch bei kurzen Einträgen:</strong> Bewege die Maus über einen Block oder wähle ihn mit der Tab-Taste an, um die erfassten Angaben zu sehen. Durch Anklicken öffnest du den Eintrag; mit der Tastatur verwendest du Enter oder die Leertaste.</P>
        <P><strong>Bearbeiten und Löschen:</strong> Öffne den Eintrag, passe die Angaben an und speichere. Über «Löschen» entfernst du ihn. Eingereichte oder abgeschlossene Einträge kannst du zunächst nur ansehen.</P>
        <P><strong>Kopieren:</strong> Öffne einen gespeicherten Eintrag und klicke oben auf «Kopieren». Tätigkeit, eigener Name und Angaben werden übernommen. Passe Datum und Uhrzeit an und speichere die Kopie. Das Original bleibt erhalten. Für Einträge aus der früheren Erfassung steht die Kopierfunktion nicht zur Verfügung.</P>
      </Section>
      <Section title="Einreichen">
        <P>Wenn du alle Tätigkeiten für den Erhebungszeitraum erfasst hast, kannst du deine Einträge einreichen:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li>Klicke auf <strong>Einreichen</strong> im Dashboard oder im Kalender.</Li>
          <Li>Das System weist auf nicht erfasste Arbeitstage sowie Vor- oder Nachmittage mit weniger als zwei erfassten Stunden hin. Prüfe die Hinweise; mit «Trotzdem einreichen» kannst du fortfahren und die Einreichung bestätigen.</Li>
          <Li>Nach dem Einreichen sind die Einträge gesperrt. Solange die Erhebung offen ist, kannst du sie mit <strong>Änderung vornehmen</strong> selbst wieder entsperren. Reiche sie nach deiner Korrektur erneut ein, damit sie wieder in die Auswertung einfliessen.</Li>
        </ul>
      </Section>

      <Section title="Häufige Fragen">
        <P><strong>Was ist eine Erhebung?</strong> Eine Erhebung ist ein definierter Zeitraum, in dem du deine Tätigkeiten erfasst. Du kannst mehreren Erhebungen zugeordnet sein.</P>
        <P><strong>Was passiert nach dem Abschluss?</strong> Wenn die Erhebung vom Administrator abgeschlossen wird, können keine neuen Einträge mehr gemacht werden. Du siehst deine Einträge noch als Archiv.</P>
        <P><strong>Ich habe meinen PIN vergessen.</strong> Bitte wende dich an den Administrator, der deinen PIN zurücksetzen kann.</P>
        <P><strong>Welche Zeitspannen soll ich erfassen?</strong> Erfasse <strong>alle Tätigkeiten</strong> deines Arbeitstags. Nur (Mittags-)Pausen lässt du frei. Bei Teilzeitpensum wählst du für die regulär freie Zeit <strong>Arbeitsfreie Zeit wegen Teilzeit</strong>, für Ferien/Krankheit/Feiertage <strong>Andere Abwesenheit</strong>. Am Ende sollte deine Woche vollständig erfasst sein (rund 8,4 h pro Arbeitstag).</P>
        <P><strong>Wie erhalte ich Zugang?</strong> Der Administrator erfasst dich für die Erhebung und sendet dir den <strong>Link zur App</strong> per E-Mail.</P>
        <P><strong>Erstanmeldung:</strong> Öffne den Link, melde dich mit deiner Kantons-E-Mail und dem temporären PIN <strong>0000</strong> an und wähle danach einen eigenen PIN.</P>
        <P><strong>Meine Erhebungen:</strong> Nach dem Login erscheinen deine Erhebungen als Tabs in der blauen Titelleiste – dort wechselst du zwischen Dashboard und Kalender.</P>
      </Section>

      {admins.length > 0 && (
        <Section title="Kontakt">
          <P>Bei Fragen oder Problemen wende dich an die zuständigen Administratoren:</P>
          <ul className="space-y-1 pl-2">
            {admins.map(email => (
              <li key={email} className="text-sm">
                <a href={`mailto:${email}`}
                  className="text-brand-600 hover:underline font-medium">
                  {email}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
