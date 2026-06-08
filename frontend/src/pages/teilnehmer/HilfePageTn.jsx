import { useEffect, useState } from "react";
import { getKontakt } from "../../api/auth";

export default function HilfePageTn() {
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    getKontakt().then(({ data }) => {
      if (data?.admins) setAdmins(data.admins);
    });
  }, []);

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
          <Li><strong>Kategorie wählen:</strong> Im erscheinenden Formular wählst du die passende Tätigkeitskategorie. Kategorien sind nach Vertraulichkeit gruppiert.</Li>
          <Li><strong>Eintrag bearbeiten / löschen:</strong> Klicke auf einen bestehenden farbigen Block, um ihn zu bearbeiten oder zu löschen.</Li>
        </ul>
      </Section>

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
        <P><strong>Welche Zeitspannen soll ich erfassen?</strong> Erfasse alle Tätigkeiten, für die es eine Kategorie gibt – also alle im Raster aufgeführten Tätigkeitstypen. Zeiträume ohne passende Kategorie (z. B. Pausen) musst du nicht zwingend eintragen.</P>
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
