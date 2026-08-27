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
      if (data) setKategorien(data);
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
          <Li><strong>Status:</strong> Offen (noch erfassbar), Eingereicht, Abgeschlossen.</Li>
          <Li><strong>Fortschritt:</strong> Balken mit erfasster Zeit gegenüber dem Soll (Arbeitstage × 8,4 h) und dem Prozentwert deiner Vollständigkeit.</Li>
          <Li><strong>Zeitanteile:</strong> Balkendiagramm deiner bisher erfassten Tätigkeitskategorien.</Li>
          <Li><strong>Tätigkeit erfassen:</strong> Öffnet den Kalender dieser Erhebung.</Li>
          <Li><strong>Einreichen:</strong> Reicht deine Einträge definitiv ein.</Li>
          <Li><strong>Änderung vornehmen:</strong> Entsperrt eingereichte Einträge, falls du noch etwas korrigieren möchtest.</Li>
        </ul>
      </Section>

      <Section title="Kalender – Einträge erfassen">
        <P>Im Kalender sind alle Kalenderwochen des Erhebungszeitraums fest untereinander dargestellt. Tage ausserhalb des Erhebungszeitraums sind ausgegraut und nicht bearbeitbar.</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li><strong>Klicken und Ziehen:</strong> Halte die Maustaste auf einem freien Zeitslot gedrückt und ziehe nach unten, um eine Zeitspanne auszuwählen. Der blaue Bereich zeigt dir Startzeit, Endzeit und Dauer.</Li>
          <Li><strong>Tätigkeit wählen:</strong> Im erscheinenden Formular wählst du die passende Tätigkeit. Die Auswahl ist nach Arbeitsform gruppiert (Einzelarbeit, Besprechung/Meeting, Abwesenheit).</Li>
          <Li><strong>Alles ausser Pausen:</strong> Erfasse alle Tätigkeiten deines Arbeitstags lückenlos. Nur (Mittags-)Pausen lässt du frei.</Li>
          <Li><strong>Teilzeit &amp; Abwesenheit:</strong> Regulär freie Zeit bei Teilzeitpensum trägst du als Abwesenheit mit Grund <strong>Teilzeit</strong> ein. Für Ferien, Krankheit oder Feiertage gibt es eine Abwesenheit mit Grund <strong>Sonstiges</strong>. So ist deine Woche vollständig.</Li>
          <Li><strong>Eintrag bearbeiten / löschen:</strong> Klicke auf einen bestehenden farbigen Block, um ihn zu bearbeiten oder zu löschen.</Li>
        </ul>
      </Section>

      {taetigkeitsGruppen.length > 0 && (
        <Section title="Übersicht der Tätigkeiten">
          <P>Hier findest du alle Tätigkeiten mit ihrer Beschreibung – gruppiert wie im Erfassungsformular. So siehst du auf einen Blick, welche Tätigkeit wann passt.</P>
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

      <Section title="Einreichen">
        <P>Wenn du alle Tätigkeiten für den Erhebungszeitraum erfasst hast, kannst du deine Einträge einreichen:</P>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <Li>Klicke auf <strong>Einreichen</strong> im Dashboard oder im Kalender.</Li>
          <Li>Das System prüft auf mögliche Lücken (unerfasste Arbeitstage). Du kannst trotzdem einreichen.</Li>
          <Li>Nach dem Einreichen sind die Einträge gesperrt. Du kannst sie mit <strong>Änderung vornehmen</strong> selbst wieder entsperren.</Li>
        </ul>
      </Section>

      <Section title="Häufige Fragen">
        <P><strong>Was ist eine Erhebung?</strong> Eine Erhebung ist ein definierter Zeitraum, in dem du deine Tätigkeiten erfasst. Du kannst mehreren Erhebungen zugeordnet sein.</P>
        <P><strong>Was passiert nach dem Abschluss?</strong> Wenn die Erhebung vom Administrator abgeschlossen wird, können keine neuen Einträge mehr gemacht werden. Du siehst deine Einträge noch als Archiv.</P>
        <P><strong>Ich habe meinen PIN vergessen.</strong> Bitte wende dich an den Administrator, der deinen PIN zurücksetzen kann.</P>
        <P><strong>Welche Zeitspannen soll ich erfassen?</strong> Erfasse <strong>alle Tätigkeiten</strong> deines Arbeitstags. Nur (Mittags-)Pausen lässt du frei. Bei Teilzeitpensum trägst du die regulär freie Zeit als Abwesenheit mit Grund <strong>Teilzeit</strong> ein, für Ferien/Krankheit/Feiertage als Abwesenheit mit Grund <strong>Sonstiges</strong>. Am Ende sollte deine Woche vollständig erfasst sein (rund 8,4 h pro Arbeitstag).</P>
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
