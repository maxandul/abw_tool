import { ARBEITSORT_OPTS, GRUPPENGROESSE_OPTS, TEILNEHMERKREIS_OPTS, RUECKZUGSBEDARF_OPTS } from '../utils/taetigkeiten';
export const RAUM_OPTS = [
  {value:'ARBEITSPLATZ',label:'Am Büroarbeitsplatz'},
  {value:'RUECKZUG',label:'In einem Rückzugs- / Telefonraum'},
  {value:'BESPRECHUNG',label:'In einem Besprechungsraum'},
  {value:'OFFEN',label:'In einem offenen Gemeinschaftsbereich'},
];
export const GRUND_OPTS = [
  {value:'KONZENTRATION',label:'Ungestört konzentrieren'},
  {value:'VERTRAULICHKEIT',label:'Vertraulichkeit – niemand soll mithören'},
  {value:'LAERM',label:'Andere nicht durch Gespräche stören'},
];
export default function TaetigkeitFragen({form, setForm, kategorie}) {
  const art = kategorie.arbeitsform;
  if (art === 'ABWESENHEIT') return <p className="text-sm text-slate-600">Für diese Abwesenheit sind keine weiteren Angaben nötig.</p>;
  const set = key => event => setForm(f => ({...f, [key]:event.target.value}));
  const select = (key, label, options, hint) => <div key={key}>
    <label className="label" htmlFor={key}>{label}</label>
    {hint && <p className="text-xs text-slate-500 mb-1">{hint}</p>}
    <select id={key} required className="input" value={form[key] || ''} onChange={set(key)}>
      <option value="" disabled>Bitte auswählen</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>;
  return <div className="space-y-4">
    {select('arbeitsort','Wo bist du selbst während dieser Tätigkeit?',ARBEITSORT_OPTS)}
    {art !== 'EINZELARBEIT' && <>
      {select('gruppengroesse','Wie viele Personen sind mit dir im selben Raum – dich eingeschlossen?',GRUPPENGROESSE_OPTS.filter(o => art === 'ONLINE' || o.value !== 'ALLEIN'), 'Eine ungefähre Einschätzung genügt. Online zugeschaltete Personen nicht mitzählen.')}
      {form.gruppengroesse && form.gruppengroesse !== 'ALLEIN' && select('teilnehmerkreis','Wer ist mit dir im Raum?',TEILNEHMERKREIS_OPTS)}
      <p className="text-sm text-slate-600">Online oder telefonisch zugeschaltete Personen: <strong>{art === 'ONLINE' ? 'Ja' : 'Nein'}</strong>. {art === 'MEETING' && 'Bei einer hybriden Besprechung wähle oben Online-Meeting / Telefonat.'}</p>
    </>}
    {form.arbeitsort === 'UEBLICHER_ARBEITSPLATZ' && <>
      {select('raumnutzung','Wo arbeitest du dabei?',RAUM_OPTS,'Wähle den tatsächlich genutzten Platz am untersuchten Standort.')}
      {select('rueckzugsbedarf','Brauchst du für diese Tätigkeit einen geschlossenen Raum?',RUECKZUGSBEDARF_OPTS,'Unabhängig davon, ob dir tatsächlich ein solcher Raum zur Verfügung steht.')}
      {form.rueckzugsbedarf === 'ERFORDERLICH' && <fieldset><legend className="label">Weshalb brauchst du einen geschlossenen Raum?</legend>
        {GRUND_OPTS.map(o => <label key={o.value} className="flex gap-2 text-sm py-1"><input type="checkbox" checked={(form.rueckzug_gruende || []).includes(o.value)} onChange={e => setForm(f => ({...f,rueckzug_gruende:e.target.checked ? [...(f.rueckzug_gruende || []),o.value] : f.rueckzug_gruende.filter(v=>v!==o.value)}))}/>{o.label}</label>)}
        <p className="text-xs text-slate-500">Mindestens einen Grund wählen; mehrere Antworten sind möglich.</p>
      </fieldset>}
    </>}
  </div>;
}
