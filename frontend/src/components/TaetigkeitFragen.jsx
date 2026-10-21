import { ARBEITSORT_OPTS, GRUPPENGROESSE_OPTS, TEILNEHMERKREIS_OPTS } from '../utils/taetigkeiten';
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
    {form.arbeitsort && art === 'MEETING' && <>
      {select('gruppengroesse','Wie viele Personen sind mit dir im selben Raum – dich eingeschlossen?',GRUPPENGROESSE_OPTS.filter(o => o.value !== 'ALLEIN'), 'Eine ungefähre Einschätzung genügt. Online zugeschaltete Personen nicht mitzählen.')}
      {form.gruppengroesse && <>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!form.online_dabei} onChange={e => setForm(f => ({...f, online_dabei:e.target.checked}))}/>An der Besprechung nehmen online zugeschaltete Personen teil (hybrid).</label>
        {select('teilnehmerkreis','Wer ist mit dir im Raum?',TEILNEHMERKREIS_OPTS)}
      </>}
    </>}
    {form.arbeitsort === 'UEBLICHER_ARBEITSPLATZ' && (art !== 'MEETING' || (form.gruppengroesse && form.teilnehmerkreis)) &&
      select('raumnutzung','Wo arbeitest du dabei?',RAUM_OPTS,'Wähle den tatsächlich genutzten Platz am untersuchten Standort.')}

  </div>;
}
