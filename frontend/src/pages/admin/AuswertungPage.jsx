import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getGruppen, getKategorien, getLastprofil, getRaumbedarf, getAnteile, getExportUrl
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

// ── Heatmap grid ─────────────────────────────────────────────────────────────
function Heatmap({ data, anzeige }) {
  const { slots } = data;
  const map = {};
  slots.forEach(s => { map[`${s.wochentag}_${s.slot_start_minuten}`] = s; });

  const allVals = slots.map(s => anzeige === "maximum" ? s.maximum : s.mittelwert);
  const globalMax = Math.max(0.001, ...allVals);
  const fmtVal = v => anzeige === "maximum" ? String(Math.round(v)) : v.toFixed(2);
  const maxLabel = anzeige === "maximum" ? `${Math.round(globalMax)} Pers.` : globalMax.toFixed(2);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 shrink-0">0</span>
        <div className="flex-1 h-2 rounded-full" style={{
          background: "linear-gradient(to right, #f1f5f9, rgba(30,58,95,0.15), rgba(30,58,95,0.55), rgba(30,58,95,1))"
        }} />
        <span className="text-xs text-slate-400 shrink-0">{maxLabel}</span>
      </div>
      <table className="w-full table-fixed text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-slate-400 font-normal pr-2 text-right pb-1" style={{ width: "3rem" }}>Zeit</th>
            {WT_NAMEN.map(d => <th key={d} className="text-center text-slate-600 pb-1 font-semibold">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TOTAL_SLOTS }, (_, si) => {
            const slotMin = si * 15;
            return (
              <tr key={si}>
                <td className="pr-2 text-slate-400 text-right leading-none"
                  style={{ fontSize: "0.6rem", width: "3rem", height: "1.1rem" }}>
                  {slotMin % 60 === 0 ? slotLabel(slotMin) : ""}
                </td>
                {[0, 1, 2, 3, 4].map(wt => {
                  const s = map[`${wt}_${slotMin}`];
                  const val = s ? (anzeige === "maximum" ? s.maximum : s.mittelwert) : 0;
                  const intensity = val / globalMax;
                  const bg = val > 0 ? `rgba(30,58,95,${Math.max(0.07, intensity).toFixed(2)})` : "#f8fafc";
                  const fg = intensity > 0.45 ? "#fff" : "#475569";
                  const tip = s ? `${WT_NAMEN[wt]} ${slotLabel(slotMin)} · Ø ${s.mittelwert.toFixed(2)} · Max ${s.maximum}` : "";
                  return (
                    <td key={wt} className="text-center cursor-default"
                      style={{ background: bg, color: fg, fontSize: "0.58rem", height: "1.1rem" }}
                      title={tip}>
                      {val > 0 ? fmtVal(val) : ""}
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
function BarRow({ name, stunden, anteil, max, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-48 text-sm text-right text-slate-600 truncate shrink-0">{name}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${(stunden / max) * 100}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-24 shrink-0 text-right">{stunden}h ({anteil}%)</span>
    </div>
  );
}

function Anteile({ data }) {
  const maxRt  = Math.max(1, ...data.raumtyp_anteile.map(r => r.stunden));
  const maxKat = data.kategorie_anteile?.length
    ? Math.max(1, ...data.kategorie_anteile.map(k => k.stunden))
    : 1;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Nach Raumtyp</h3>
        <div className="space-y-1.5">
          {data.raumtyp_anteile.filter(r => r.stunden > 0).map(r => (
            <BarRow key={r.id} name={r.name} stunden={r.stunden}
              anteil={r.anteil_prozent} max={maxRt} color="bg-brand-600" />
          ))}
          <p className="text-xs text-slate-400 pt-1">Gesamt: {data.gesamt_stunden}h</p>
        </div>
      </div>
      {data.kategorie_anteile?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Nach Kategorie</h3>
          <div className="space-y-1.5">
            {data.kategorie_anteile.map(k => (
              <BarRow key={k.id} name={k.name} stunden={k.stunden}
                anteil={k.anteil_prozent} max={maxKat} color="bg-brand-400" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kategorie-Filter ─────────────────────────────────────────────────────────
const VERT_ORDER  = ["OFFEN", "INTERN", "VERTRAULICH"];
const VERT_LABELS = { OFFEN: "Öffentlich (externe dürfen zuhören)", INTERN: "Intern (nur Kolleg:innen)", VERTRAULICH: "Vertraulich (abgeschlossener Raum)" };
const GRP_ORDER   = ["ALLEIN", "KLEIN", "MITTEL", "GROSS"];

function KategorieFilter({ kategorien, aktiveIds, onToggle }) {
  // Group and sort
  const byVert = {};
  kategorien.forEach(k => {
    const v = k.vertraulichkeit || "_KEINE";
    if (!byVert[v]) byVert[v] = [];
    byVert[v].push(k);
  });
  const grpIdx = g => GRP_ORDER.indexOf(g) === -1 ? 99 : GRP_ORDER.indexOf(g);
  Object.values(byVert).forEach(arr => arr.sort((a, b) => grpIdx(a.gruppengroesse) - grpIdx(b.gruppengroesse)));

  const chip = k => (
    <button key={k.id} type="button" onClick={() => onToggle(k.id)}
      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
        aktiveIds.includes(k.id)
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
      }`}>
      {k.name}
    </button>
  );

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Kategorien auswählen{aktiveIds.length > 0 ? ` (${aktiveIds.length} aktiv)` : " – mind. 1 wählen"}:
        </p>
        {aktiveIds.length > 0 && (
          <button type="button" onClick={() => onToggle(null)}
            className="text-xs text-slate-400 hover:text-slate-600 underline">
            Alle abwählen
          </button>
        )}
      </div>
      {VERT_ORDER.filter(v => byVert[v]?.length).map(v => (
        <div key={v}>
          <p className="text-xs text-slate-400 mb-1">{VERT_LABELS[v]}</p>
          <div className="flex flex-wrap gap-1.5">{byVert[v].map(chip)}</div>
        </div>
      ))}
      {byVert["_KEINE"]?.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1">Ohne Klassifizierung</p>
          <div className="flex flex-wrap gap-1.5">{byVert["_KEINE"].map(chip)}</div>
        </div>
      )}
    </div>
  );
}

const LP_HINTS = {
  mittelwert: "Mittelwert (Ø Personen): Pro Teilnehmer und gewählter Kategorie wird berechnet, in wie vielen der erfassten Wochen ein Eintrag vorhanden war – geteilt durch die Anzahl Wochen. Diese Anteile werden über alle Kategorien und Teilnehmenden summiert. Das Ergebnis gibt an, wie viele Personen diesen Slot pro Woche im Durchschnitt belegt haben.",
  maximum:    "Maximum (Personen): Anzahl unterschiedlicher Teilnehmender, die diesen Slot über die gesamte Erhebungsdauer mindestens einmal mit einer der gewählten Kategorien belegt haben. Pro Teilnehmer und Slot wird maximal 1 gezählt, unabhängig von Anzahl Wochen oder Kategorien.",
};

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AuswertungPage() {
  const [searchParams] = useSearchParams();
  const [gruppen, setGruppen]       = useState([]);
  const [kategorien, setKategorien] = useState([]);
  const [gruppeIds, setGruppeIds]   = useState(
    searchParams.get("gruppe_id") ? [parseInt(searchParams.get("gruppe_id"))] : []
  );
  const [kategorieIds, setKategorieIds] = useState([]);
  const [anzeige, setAnzeige] = useState("mittelwert");
  const [lp, setLp]           = useState(null);
  const [lpLoading, setLpLoading] = useState(false);
  const [rb, setRb]           = useState(null);
  const [ant, setAnt]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    getGruppen(true).then(({ data }) => {
      if (!data) return;
      setGruppen(data);
      const urlId = searchParams.get("gruppe_id") ? parseInt(searchParams.get("gruppe_id")) : null;
      if (urlId && data.find(x => x.id === urlId)) setGruppeIds([urlId]);
      // No auto-select: user must choose explicitly
    });
    getKategorien().then(({ data }) => {
      if (data) setKategorien(data.filter(k => k.aktiv));
    });
  }, []);

  const buildParams = useCallback(() =>
    `gruppe_ids=${gruppeIds.join(",")}`, [gruppeIds]);

  const buildLpParams = useCallback(() => {
    let p = buildParams();
    if (kategorieIds.length) p += `&kategorie_ids=${kategorieIds.join(",")}`;
    return p;
  }, [buildParams, kategorieIds]);

  // Load Raumbedarf + Anteile when gruppeIds changes
  const load = useCallback(async () => {
    if (!gruppeIds.length) return;
    setError(""); setLoading(true);
    const p = buildParams();
    const [r, a] = await Promise.all([getRaumbedarf(p), getAnteile(p)]);
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    setRb(r.data); setAnt(a.data);
  }, [buildParams]);

  useEffect(() => {
    if (gruppeIds.length) load();
    else { setRb(null); setAnt(null); setLp(null); }
  }, [gruppeIds.join(",")]);

  // Load Lastprofil when gruppeIds or kategorieIds change
  const reloadLp = useCallback(async () => {
    if (!gruppeIds.length || !kategorieIds.length) { setLp(null); return; }
    setLpLoading(true);
    const { data, error: e } = await getLastprofil(buildLpParams());
    setLpLoading(false);
    if (e) setError(e); else setLp(data);
  }, [gruppeIds.join(","), kategorieIds.join(","), buildLpParams]);

  useEffect(() => { reloadLp(); }, [gruppeIds.join(","), kategorieIds.join(",")]);

  const toggleGruppe    = id => setGruppeIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const toggleKategorie = id => {
    if (id === null) { setKategorieIds([]); return; }
    setKategorieIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  const offene     = gruppen.filter(g => g.aktiv && !g.abgeschlossen);
  const geschl     = gruppen.filter(g => g.aktiv && g.abgeschlossen);
  const archiviert = gruppen.filter(g => !g.aktiv);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Auswertung</h1>

      {/* Erhebungsauswahl */}
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Erhebung</label>
            <select className="input"
              value={gruppeIds[0] ?? ""}
              onChange={e => setGruppeIds([parseInt(e.target.value)])}>
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
          {(rb || ant) && (
            <a href={getExportUrl(buildParams())} download className="btn-secondary">
              Exportieren (HTML)
            </a>
          )}
          {loading && <Spinner size="sm" />}
        </div>

        {gruppeIds.length > 0 && gruppen.length > 1 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Mehrere Erhebungen zusammenfassen:</p>
            <div className="flex flex-wrap gap-2">
              {gruppen.map(g => (
                <button key={g.id} type="button" onClick={() => toggleGruppe(g.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    gruppeIds.includes(g.id)
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
      {!gruppeIds.length && !loading && (
        <div className="card text-center text-slate-500 py-12">Wähle eine Erhebung aus.</div>
      )}

      {/* Lastprofil */}
      {gruppeIds.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-slate-800">Lastprofil – Wochenansicht</h2>
            <div className="flex gap-2">
              {["mittelwert", "maximum"].map(a => (
                <button key={a} onClick={() => setAnzeige(a)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${anzeige === a ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-300"}`}>
                  {a === "mittelwert" ? "Mittelwert" : "Maximum"}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mb-4">
            {LP_HINTS[anzeige]}
          </p>

          {/* Category filter – grouped by Vertraulichkeit × Gruppengrösse */}
          <KategorieFilter
            kategorien={kategorien}
            aktiveIds={kategorieIds}
            onToggle={toggleKategorie}
          />

          {kategorieIds.length === 0
            ? <div className="text-center text-slate-400 py-12 text-sm">Wähle mindestens eine Kategorie, um das Lastprofil anzuzeigen.</div>
            : lpLoading
              ? <div className="flex justify-center py-12"><Spinner /></div>
              : lp ? <Heatmap data={lp} anzeige={anzeige} /> : null
          }
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
