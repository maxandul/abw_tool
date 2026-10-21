import { useEffect, useState } from 'react';
import { getKategorien } from '../../api/admin';
import Alert from '../../components/Alert';
export default function KategorienPage() {
  const [items,setItems] = useState([]); const [error,setError] = useState('');
  useEffect(()=>{getKategorien().then(({data,error})=>{setItems(data || []);setError(error || '');});},[]);
  const rows = list => list.map(k=><div key={k.id} className="card border-l-4" style={{borderLeftColor:k.farbe}}><h2 className="font-semibold">{k.name}</h2><p className="text-sm text-slate-600 mt-1">{k.beschreibung}</p></div>);
  return <div className="max-w-4xl mx-auto p-6 space-y-4"><h1 className="text-2xl font-bold">Tätigkeiten und Erfassung</h1>
    {error && <Alert>{error}</Alert>}
    <p>Für neue Einträge stehen diese fünf Grundtypen bereit. Die Teilnehmenden ergänzen Aufenthaltsort, Personen im selben Raum, tatsächliche Raumnutzung und benötigten Rückzug.</p>
    {rows(items.filter(k=>k.schema_version===2))}
    <div className="card text-sm">Gruppengrössen werden geschätzt: nur ich, 2–4, 5–8, 9–12 oder 13 und mehr. Online zugeschaltete Personen werden nicht mitgezählt. Hybride Besprechungen werden als Besprechung / Zusammenarbeit vor Ort mit Online-Teilnahme erfasst.</div>
    <details><summary className="cursor-pointer font-semibold">Bisherige Tätigkeiten / historische Daten</summary><p className="text-sm my-3">Bestehende Einträge behalten ihre ursprüngliche Bedeutung. Neue Angaben zu Raumnutzung und Rückzugsgründen werden nicht rückwirkend angenommen.</p><div className="space-y-3">{rows(items.filter(k=>k.schema_version!==2))}</div></details>
  </div>;
}
