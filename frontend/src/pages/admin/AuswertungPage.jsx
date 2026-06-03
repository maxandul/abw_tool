import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getGruppen, getLastprofil, getRaumbedarf, getAnteile, getKennzahlen, getExportUrl
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";

const WT_NAMEN = ["Mo", "Di", "Mi", "Do", "Fr"];
const SLOT_START_H = 7;
const SLOTS_PER_H = 4;
const TOTAL_SLOTS = 12 * 4; // 07:00–19:00

function slotLabel(slotMin) {
  const total = SLOT_START_H * 60 + slotMin;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ── Heatmap ─────────────────────────────────────────────────────────────────
function Heatmap({ data, anzeige }) {
  const { slots, raumtypen } = data;
  const days = WT_NAMEN.map((_, i) => i);

  // Build map: (wt, slotMin) -> value
  const map = {};
  slots.forEach(s => {
    const key = `${s.wochentag}_${s.slot_start_minuten}`;
    if (!map[key]) map[key] = { mittelwert: 0, maximum: 0, minimum: Infinity, count: 0 };
    map[key].mittelwert += s.mittelwert;
    map[key].maximum = Math.max(map[key].maximum, s.maximum);
    map[key].minimum = Math.min(map[key].minimum, s.minimum);
    map[key].count++;
  });

  const getVal = (key) => {
    const v = map[key];
    if (!v) return 0;
    if (anzeige === "maximum") return v.maximum;
    if (anzeige === "minimum") return v.minimum === Infinity ? 0 : v.minimum;
    return v.mittelwert;
  };

  const maxVal = Math.max(1, ...Object.values(map).map(v => getVal(`placeholder_${v.count}`)));
  const allVals = slots.map(s => {
    const k = `${s.wochentag}_${s.slot_start_minuten}`;
    return getVal(k);
  });
  const globalMax = Math.max(1, ...allVals);

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="w-12 text-slate-400 font-normal pr-2 text-right">Zeit</th>
            {days.map(d => <th key={d} className="w-16 text-center text-slate-600 pb-1 font-semibold">{WT_NAMEN[d]}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TOTAL_SLOTS }, (_, si) => {
            const slotMin = si * 15;
            return (
              <tr key={si}>
                <td className="pr-2 text-slate-400 text-right leading-none py-px" style={{ fontSize: "0.6rem" }}>
                  {slotMin % 60 === 0 ? slotLabel(slotMin) : ""}
                </td>
                {days.map(wt => {
                  const key = `${wt}_${slotMin}`;
                  const val = getVal(key);
                  const intensity = val / globalMax;
                  const bg = val > 0
                    ? `rgba(30,58,95,${Math.max(0.05, intensity).toFixed(2)})`
                    : "#f8fafc";
                  const fg = intensity > 0.5 ? "#fff" : "#64748b";
                  return (
                    <td key={wt}
                      className="w-16 h-3.5 text-center cursor-default"
                      style={{ background: bg, color: fg, fontSize: "0.55rem" }}
                      title={`${WT_NAMEN[wt]} ${slotLabel(slotMin)} | ${anzeige}: ${val.toFixed ? val.toFixed(1) : val}`}>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Raumbedarf ───────────────────────────────────────────────────────────────
function Raumbedarf({ data }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Raumtyp</th>
              <th className="table-th text-right">Ø Nutzung</th>
              <th className="table-th text-right">Peak</th>
              <th className="table-th text-right">Sharing-Ratio</th>
              <th className="table-th text-right">Einheiten (Ø)</th>
              <th className="table-th text-right">Einheiten (Peak)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.raumtypen.map(r => (
              <tr key={r.id}>
                <td className="table-td font-medium">{r.name}</td>
                <td className="table-td text-right">{r.avg_nutzung}</td>
                <td className="table-td text-right">{r.peak_nutzung}</td>
                <td className="table-td text-right">{data.sharing_ratio}</td>
                <td className="table-td text-right font-semibold">{r.einheiten_avg}</td>
                <td className="table-td text-right font-semibold">{r.einheiten_peak}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="table-td">Anwesend total</td>
              <td className="table-td text-right">{data.anwesend_total.avg_nutzung}</td>
              <td className="table-td text-right">{data.anwesend_total.peak_nutzung}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Die empfohlene Anzahl Einheiten basiert auf der Sharing-Ratio ({data.sharing_ratio}). Ø-Werte sind kosteneffizienter, Peak-Werte decken Spitzenlastzeiten ab.
      </p>
    </div>
  );
}

// ── Anteile ──────────────────────────────────────────────────────────────────
function Anteile({ data }) {
  const max = Math.max(1, ...data.raumtyp_anteile.map(r => r.stunden));
  return (
    <div className="space-y-2">
      {data.raumtyp_anteile.map(r => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="w-48 text-sm text-right text-slate-600 truncate shrink-0">{r.name}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${(r.stunden / max) * 100}%` }} />
          </div>
          <span className="text-xs text-slate-500 w-28 shrink-0">{r.stunden}h ({r.anteil_prozent}%)</span>
        </div>
      ))}
      <p className="text-xs text-slate-400 pt-1">Gesamt: {data.gesamt_stunden}h</p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AuswertungPage() {
  const [searchParams] = useSearchParams();
  const [gruppen, setGruppen] = useState([]);
  const [filter, setFilter] = useState({
    gruppe_ids: searchParams.get("gruppe_id") ? [parseInt(searchParams.get("gruppe_id"))] : [],
    datum_von: "", datum_bis: "",
  });
  const [anzeige, setAnzeige] = useState("mittelwert");
  const [lp, setLp]     = useState(null);
  const [rb, setRb]     = useState(null);
  const [ant, setAnt]   = useState(null);
  const [kz, setKz]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getGruppen(true).then(({ data }) => {
      if (!data) return;
      setGruppen(data);
      // Pre-select from URL param
      const urlId = searchParams.get("gruppe_id") ? parseInt(searchParams.get("gruppe_id")) : null;
      if (urlId) {
        const g = data.find(x => x.id === urlId);
        if (g) setFilter(f => ({ ...f, gruppe_ids: [urlId], datum_von: f.datum_von || g.zeitraum_von, datum_bis: f.datum_bis || g.zeitraum_bis }));
      } else if (data.length > 0) {
        const first = data[0];
        setFilter(f => ({ ...f, gruppe_ids: [first.id], datum_von: first.zeitraum_von, datum_bis: first.zeitraum_bis }));
      }
    });
  }, []);

  const buildParams = useCallback(() => {
    const ids = filter.gruppe_ids.join(",");
    let p = `gruppe_ids=${ids}`;
    if (filter.datum_von) p += `&datum_von=${filter.datum_von}`;
    if (filter.datum_bis) p += `&datum_bis=${filter.datum_bis}`;
    return p;
  }, [filter]);

  const load = useCallback(async () => {
    if (!filter.gruppe_ids.length) return;
    setError(""); setLoading(true);
    const p = buildParams();
    const [l, r, a, k] = await Promise.all([
      getLastprofil(p), getRaumbedarf(p), getAnteile(p), getKennzahlen(p)
    ]);
    setLoading(false);
    if (l.error) { setError(l.error); return; }
    setLp(l.data); setRb(r.data); setAnt(a.data); setKz(k.data);
  }, [buildParams, filter.gruppe_ids.length]);

  useEffect(() => { if (filter.gruppe_ids.length) load(); }, [filter.gruppe_ids.length]);

  const toggleGruppe = (id) => {
    setFilter(f => {
      const ids = f.gruppe_ids.includes(id) ? f.gruppe_ids.filter(x => x !== id) : [...f.gruppe_ids, id];
      return { ...f, gruppe_ids: ids };
    });
  };

  const selectGruppeFromDropdown = (id) => {
    const g = gruppen.find(x => x.id === id);
    setFilter(f => ({
      gruppe_ids: [id],
      datum_von: g?.zeitraum_von || f.datum_von,
      datum_bis: g?.zeitraum_bis || f.datum_bis,
    }));
  };

  // Group Erhebungen by status for display
  const offene     = gruppen.filter(g => g.aktiv && !g.abgeschlossen);
  const geschl     = gruppen.filter(g => g.aktiv && g.abgeschlossen);
  const archiviert = gruppen.filter(g => !g.aktiv);

  const selectedNames = filter.gruppe_ids
    .map(id => gruppen.find(g => g.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Auswertung</h1>

      {/* Filter */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Erhebungen auswählen</h2>

        {/* Primary dropdown (single-select, sets dates automatically) */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Erhebung</label>
            <select className="input"
              value={filter.gruppe_ids[0] ?? ""}
              onChange={e => selectGruppeFromDropdown(parseInt(e.target.value))}>
              <option value="" disabled>Bitte wählen…</option>
              {offene.length > 0 && (
                <optgroup label="Offen">
                  {offene.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </optgroup>
              )}
              {geschl.length > 0 && (
                <optgroup label="Abgeschlossen">
                  {geschl.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </optgroup>
              )}
              {archiviert.length > 0 && (
                <optgroup label="Archiviert">
                  {archiviert.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="label">Zeitraum von</label>
            <input type="date" className="input" value={filter.datum_von}
              onChange={e => setFilter(f => ({ ...f, datum_von: e.target.value }))} />
          </div>
          <div>
            <label className="label">Zeitraum bis</label>
            <input type="date" className="input" value={filter.datum_bis}
              onChange={e => setFilter(f => ({ ...f, datum_bis: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={load} disabled={loading || !filter.gruppe_ids.length}>
            {loading ? <Spinner size="sm" /> : "Aktualisieren"}
          </button>
          {lp && (
            <a href={getExportUrl(buildParams())} download className="btn-secondary">
              Exportieren (HTML)
            </a>
          )}
        </div>

        {/* Multi-select for comparison: show all as toggleable chips */}
        {gruppen.length > 1 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Mehrere Erhebungen zusammenfassen (für Vergleich):</p>
            <div className="flex flex-wrap gap-2">
              {gruppen.map(g => (
                <button key={g.id} type="button"
                  onClick={() => toggleGruppe(g.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filter.gruppe_ids.includes(g.id)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}>
                  {g.name}
                  {!g.aktiv && <span className="ml-1 opacity-60">(archiviert)</span>}
                  {g.aktiv && g.abgeschlossen && <span className="ml-1 opacity-60">(abgeschl.)</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {!lp && !loading && <div className="card text-center text-slate-500 py-12">Wähle eine Erhebung und klicke «Aktualisieren».</div>}

      {kz && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Anwesenheitsquote", `${kz.anwesenheitsquote}%`],
            ["Stille Arbeit",     `${kz.stille_arbeit}%`],
            ["Kommunikative Arbeit", `${kz.kommunikative_arbeit}%`],
            ["Ø Anwesende",      kz.avg_anwesende],
          ].map(([label, val]) => (
            <div key={label} className="card text-center py-4">
              <div className="text-2xl font-bold text-brand-600">{val}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {lp && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Lastprofil – Wochenansicht</h2>
            <div className="flex gap-2">
              {["mittelwert", "maximum", "minimum"].map(a => (
                <button key={a} onClick={() => setAnzeige(a)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${anzeige === a ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-300"}`}>
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Heatmap data={lp} anzeige={anzeige} />
        </div>
      )}

      {rb && (
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Raumbedarf</h2>
          <Raumbedarf data={rb} />
        </div>
      )}

      {ant && (
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Anteilsübersicht</h2>
          <Anteile data={ant} />
        </div>
      )}
    </div>
  );
}
