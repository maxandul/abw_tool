import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getGruppen, getKategorien, getTeilnehmerFilter, getSample,
  getLastprofil, getRaumbedarf, getAnteile, getExportUrl
} from "../../api/admin";
import { groupByTaetigkeitsgruppe } from "../../utils/taetigkeiten";
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

const LABEL_W = "14rem";

// ── Bedarf nach Tätigkeit ────────────────────────────────────────────────────
function TaetigkeitenBedarf({ data }) {
  return (
    <div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-4 text-sm text-slate-600 space-y-1">
        <p>
          Die Karte zeigt, wie viele Personen eine Tätigkeit in den ausgewählten Erhebungen
          gleichzeitig ausübten. Grundlage sind 15-Minuten-Zeitfenster und ausschliesslich
          eingereichte Erhebungen.
        </p>
        <p className="text-xs text-slate-500">
          <strong>Ø Nutzung:</strong> mittlere gleichzeitige Nutzung in den Zeitfenstern, in denen
          die Tätigkeit vorkam. <strong>Peak:</strong> höchste gleichzeitige Nutzung in einem
          einzelnen Zeitfenster. <strong>Einheiten:</strong> jeweilige Nutzung auf die nächste
          ganze Einheit aufgerundet (eine Einheit pro Person). <strong>Anwesend total:</strong>
          gleichzeitig anwesende Personen über alle internen Tätigkeiten, pro Zeitfenster
          nur einmal gezählt.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th min-w-[14rem]">Tätigkeit</th>
              <th className="table-th text-right">Ø Nutzung</th>
              <th className="table-th text-right">Peak</th>
              <th className="table-th text-right">Einheiten (Ø)</th>
              <th className="table-th text-right">Einheiten (Peak)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.taetigkeiten.map(r => {
              const color = r.farbe || undefined;
              return (
              <tr key={r.id} style={color ? { color } : undefined}>
                <td className="table-td font-medium align-top break-words">{r.name}</td>
                <td className="table-td text-right">{r.avg_nutzung}</td>
                <td className="table-td text-right">{r.peak_nutzung}</td>
                <td className="table-td text-right font-semibold">{r.einheiten_avg}</td>
                <td className="table-td text-right font-semibold">{r.einheiten_peak}</td>
              </tr>
            );})}
            <tr className="bg-slate-50 font-semibold">
              <td className="table-td">Anwesend total</td>
              <td className="table-td text-right">{data.anwesend_total.avg_nutzung}</td>
              <td className="table-td text-right">{data.anwesend_total.peak_nutzung}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Ø-Werte bilden den typischen Bedarf während der tatsächlichen Nutzung ab; Peak-Werte
        decken die höchste beobachtete Spitzenlast ab. Externe Tätigkeiten wie Homeoffice und
        Teilzeit sind nicht enthalten.
      </p>
    </div>
  );
}

// ── Anteile ──────────────────────────────────────────────────────────────────
function BarRow({ name, stunden, anteil, max, barColor = "#1e3a5f", labelColor }) {
  const pct = Math.min(100, (stunden / max) * 100);
  const textColor = labelColor || barColor;
  return (
    <div className="flex items-center gap-3 w-full">
      <span
        className="text-sm break-words leading-snug shrink-0"
        style={{ width: LABEL_W, color: textColor }}
      >
        {name}
      </span>
      <div className="flex-1 min-w-0 bg-slate-100 rounded-full h-3.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap text-right min-w-[5.5rem]">
        {stunden}h ({anteil}%)
      </span>
    </div>
  );
}

function Anteile({ data }) {
  const tgAnteile = data.taetigkeitsgruppe_anteile ?? [];
  const maxTg = Math.max(1, ...tgAnteile.map(r => r.stunden));
  const maxKat = data.kategorie_anteile?.length
    ? Math.max(1, ...data.kategorie_anteile.map(k => k.stunden))
    : 1;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Nach Tätigkeitsgruppe</h3>
        <div className="space-y-1.5">
          {tgAnteile.filter(r => r.stunden > 0).map(r => (
            <BarRow key={r.gruppe} name={r.name} stunden={r.stunden}
              anteil={r.anteil_prozent} max={maxTg} barColor="#1e3a5f" labelColor="#475569" />
          ))}
          <p className="text-xs text-slate-400 pt-1">Gesamt: {data.gesamt_stunden}h</p>
        </div>
      </div>
      {data.kategorie_anteile?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Nach Tätigkeit</h3>
          <div className="space-y-1.5">
            {data.kategorie_anteile.map(k => (
              <BarRow key={k.id} name={k.name} stunden={k.stunden}
                anteil={k.anteil_prozent} max={maxKat}
                barColor={k.farbe || "#64748b"} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teilnehmer-Filter ────────────────────────────────────────────────────────
const EMPTY_TN_FILTER = { funktionen: [], organisationseinheiten: [], beschaeftigungsgrade: [] };

function FilterChipGroup({ label, items, selected, onToggle, formatLabel }) {
  if (!items?.length) return null;
  const fmt = formatLabel ?? (v => v);
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => {
          const key = String(item);
          const active = selected.includes(item);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(item)}
              className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {fmt(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TeilnehmerFilterCard({ options, filters, onChange, onClear }) {
  const activeCount =
    filters.funktionen.length +
    filters.organisationseinheiten.length +
    filters.beschaeftigungsgrade.length;

  const toggle = (key, value) => {
    onChange({
      ...filters,
      [key]: filters[key].includes(value)
        ? filters[key].filter(v => v !== value)
        : [...filters[key], value],
    });
  };

  const hasOptions =
    options?.funktionen?.length ||
    options?.organisationseinheiten?.length ||
    options?.beschaeftigungsgrade?.length;

  if (!hasOptions) {
    return (
      <div className="card text-sm text-slate-500">
        Keine Teilnehmerattribute für die gewählte Erhebung vorhanden.
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">Teilnehmer-Filter</h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-600 underline">
            Alle Filter zurücksetzen
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Optional einschränken nach Funktion, Organisationseinheit oder Beschäftigungsgrad.
        Wirkt auf Lastprofil, Bedarf nach Tätigkeit und Anteilsübersicht.
        {activeCount > 0 && (
          <span className="text-brand-600"> ({activeCount} Filter aktiv)</span>
        )}
      </p>
      <FilterChipGroup
        label="Funktion"
        items={options.funktionen}
        selected={filters.funktionen}
        onToggle={v => toggle("funktionen", v)}
      />
      <FilterChipGroup
        label="Organisationseinheit"
        items={options.organisationseinheiten}
        selected={filters.organisationseinheiten}
        onToggle={v => toggle("organisationseinheiten", v)}
      />
      <FilterChipGroup
        label="Beschäftigungsgrad"
        items={options.beschaeftigungsgrade}
        selected={filters.beschaeftigungsgrade}
        onToggle={v => toggle("beschaeftigungsgrade", v)}
        formatLabel={v => `${v % 1 === 0 ? v : v.toFixed(1)}%`}
      />
    </div>
  );
}

// ── Tätigkeiten-Filter ───────────────────────────────────────────────────────
function TaetigkeitFilter({ kategorien, aktiveIds, onToggle }) {
  const groups = groupByTaetigkeitsgruppe(kategorien);

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
          Tätigkeiten auswählen{aktiveIds.length > 0 ? ` (${aktiveIds.length} aktiv)` : " – mind. 1 wählen"}:
        </p>
        {aktiveIds.length > 0 && (
          <button type="button" onClick={() => onToggle(null)}
            className="text-xs text-slate-400 hover:text-slate-600 underline">
            Alle abwählen
          </button>
        )}
      </div>
      {groups.map(g => (
        <div key={g.key}>
          <p className="text-xs text-slate-400 mb-1">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">{g.items.map(chip)}</div>
        </div>
      ))}
    </div>
  );
}

const LP_HINTS = {
  mittelwert: "Mittelwert (Ø Personen): Pro Teilnehmer und gewählter Tätigkeit wird berechnet, in wie vielen der erfassten Wochen ein Eintrag vorhanden war – geteilt durch die Anzahl Wochen. Diese Anteile werden über alle Tätigkeiten und Teilnehmenden summiert. Das Ergebnis gibt an, wie viele Personen diesen Slot pro Woche im Durchschnitt belegt haben.",
  maximum:    "Maximum (Personen): Anzahl unterschiedlicher Teilnehmender, die diesen Slot über die gesamte Erhebungsdauer mindestens einmal mit einer der gewählten Tätigkeiten belegt haben. Pro Teilnehmer und Slot wird maximal 1 gezählt, unabhängig von Anzahl Wochen oder Tätigkeiten.",
};

// ── Sample-Info ──────────────────────────────────────────────────────────────
function SampleStat({ label, value, hint }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-lg font-semibold text-slate-800 leading-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {hint && <p className="text-[0.7rem] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SampleCard({ data, loading }) {
  if (loading && !data) {
    return <div className="card flex justify-center py-6"><Spinner size="sm" /></div>;
  }
  if (!data) return null;

  const v = data.vollstaendigkeit_prozent ?? 0;
  const vColor = v >= 85 ? "#16a34a" : v >= 60 ? "#d97706" : "#dc2626";
  const unter = data.teilnehmer_unter_schwelle ?? [];
  const schwelle = data.schwelle_prozent ?? 85;
  const fmtGrad = g => `${g % 1 === 0 ? g : g.toFixed(1)}%`;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">Stichprobe</h2>
        {data.filter_aktiv && (
          <span className="text-xs text-brand-600 bg-brand-50 rounded-full px-2.5 py-0.5">
            Sample eingeschränkt durch Filter
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SampleStat
          label="Eingereicht"
          value={`${data.eingereicht} / ${data.teilnehmer_im_sample}`}
          hint={data.nicht_eingereicht > 0
            ? `${data.nicht_eingereicht} noch nicht eingereicht`
            : "alle eingereicht"}
        />
        <SampleStat
          label="FTE (eingereicht)"
          value={data.fte_summe}
          hint="Summe der Beschäftigungsgrade"
        />
        <SampleStat
          label="Erfasste Zeit"
          value={`${data.erfasste_stunden}h`}
          hint={`von ${data.erwartete_stunden}h erwartet`}
        />
        <SampleStat
          label="Zeitraum"
          value={`${data.arbeitstage} Arbeitstage`}
          hint={`${data.anzahl_gruppen} Erhebung${data.anzahl_gruppen === 1 ? "" : "en"}`}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Vollständigkeit der Eingereichten</span>
          <span className="font-semibold" style={{ color: vColor }}>{v}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, v)}%`, backgroundColor: vColor }} />
        </div>
        <p className="text-xs text-slate-400">
          Nur eingereichte Teilnehmer fliessen in die Auswertung ein
          {" "}(Soll: Arbeitstage × 8,4h pro Person).
          {" "}Übererfassung wird je Teilnehmer auf 100% begrenzt, damit Lücken sichtbar bleiben.
        </p>
      </div>

      {unter.length > 0 && (
        <details className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
          <summary className="text-sm text-amber-800 cursor-pointer select-none">
            {unter.length} Teilnehmer unter {schwelle}% Vollständigkeit
          </summary>
          <ul className="mt-2 space-y-1">
            {unter.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                <span className="truncate">
                  {t.user_id && t.gruppe_id ? (
                    <Link
                      to={`/admin/gruppen/${t.gruppe_id}/teilnehmer/${t.user_id}/eintraege`}
                      className="text-brand-600 hover:underline">
                      {t.name}
                    </Link>
                  ) : t.name}
                  {t.beschaeftigungsgrad != null && (
                    <span className="text-slate-400"> · {fmtGrad(t.beschaeftigungsgrad)}</span>
                  )}
                </span>
                <span className="font-medium text-amber-700 shrink-0">
                  {t.vollstaendigkeit_prozent}%
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AuswertungPage() {
  const [searchParams] = useSearchParams();
  const [gruppen, setGruppen]       = useState([]);
  const [kategorien, setKategorien] = useState([]);
  const [gruppeIds, setGruppeIds]   = useState(
    searchParams.get("gruppe_id") ? [parseInt(searchParams.get("gruppe_id"))] : []
  );
  const [kategorieIds, setKategorieIds] = useState([]);
  const [tnFilterOptions, setTnFilterOptions] = useState(null);
  const [tnFilter, setTnFilter] = useState(EMPTY_TN_FILTER);
  const [anzeige, setAnzeige] = useState("mittelwert");
  const [sample, setSample]   = useState(null);
  const [sampleLoading, setSampleLoading] = useState(false);
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

  const appendTnFilterParams = useCallback((p) => {
    let q = p;
    if (tnFilter.funktionen.length) {
      q += `&funktionen=${encodeURIComponent(tnFilter.funktionen.join(","))}`;
    }
    if (tnFilter.organisationseinheiten.length) {
      q += `&organisationseinheiten=${encodeURIComponent(tnFilter.organisationseinheiten.join(","))}`;
    }
    if (tnFilter.beschaeftigungsgrade.length) {
      q += `&beschaeftigungsgrade=${tnFilter.beschaeftigungsgrade.join(",")}`;
    }
    return q;
  }, [tnFilter]);

  const buildParams = useCallback(() =>
    appendTnFilterParams(`gruppe_ids=${gruppeIds.join(",")}`),
    [gruppeIds, appendTnFilterParams]);

  const buildLpParams = useCallback(() => {
    let p = buildParams();
    if (kategorieIds.length) p += `&kategorie_ids=${kategorieIds.join(",")}`;
    return p;
  }, [buildParams, kategorieIds]);

  useEffect(() => {
    if (!gruppeIds.length) {
      setTnFilterOptions(null);
      setTnFilter(EMPTY_TN_FILTER);
      return;
    }
    setTnFilter(EMPTY_TN_FILTER);
    getTeilnehmerFilter(`gruppe_ids=${gruppeIds.join(",")}`).then(({ data }) => {
      if (data) setTnFilterOptions(data);
    });
  }, [gruppeIds.join(",")]);

  // Load Raumbedarf + Anteile when gruppeIds changes
  const load = useCallback(async () => {
    if (!gruppeIds.length) return;
    setError(""); setLoading(true); setSampleLoading(true);
    const p = buildParams();
    const [r, a, s] = await Promise.all([getRaumbedarf(p), getAnteile(p), getSample(p)]);
    setLoading(false); setSampleLoading(false);
    if (s.data) setSample(s.data);
    if (r.error) { setError(r.error); return; }
    setRb(r.data); setAnt(a.data);
  }, [buildParams]);

  useEffect(() => {
    if (gruppeIds.length) load();
    else { setRb(null); setAnt(null); setLp(null); setSample(null); }
  }, [gruppeIds.join(","), tnFilter]);

  // Load Lastprofil when gruppeIds, kategorieIds or tnFilter change
  const reloadLp = useCallback(async () => {
    if (!gruppeIds.length || !kategorieIds.length) { setLp(null); return; }
    setLpLoading(true);
    const { data, error: e } = await getLastprofil(buildLpParams());
    setLpLoading(false);
    if (e) setError(e); else setLp(data);
  }, [gruppeIds.join(","), kategorieIds.join(","), tnFilter, buildLpParams]);

  useEffect(() => { reloadLp(); }, [gruppeIds.join(","), kategorieIds.join(","), tnFilter]);

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
            <a href={getExportUrl(`${buildLpParams()}&anzeige=${anzeige}`)} download className="btn-secondary">
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

      {gruppeIds.length > 0 && (
        <TeilnehmerFilterCard
          options={tnFilterOptions}
          filters={tnFilter}
          onChange={setTnFilter}
          onClear={() => setTnFilter(EMPTY_TN_FILTER)}
        />
      )}

      {gruppeIds.length > 0 && (
        <SampleCard data={sample} loading={sampleLoading} />
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

          <TaetigkeitFilter
            kategorien={kategorien}
            aktiveIds={kategorieIds}
            onToggle={toggleKategorie}
          />

          {kategorieIds.length === 0
            ? <div className="text-center text-slate-400 py-12 text-sm">Wähle mindestens eine Tätigkeit, um das Lastprofil anzuzeigen.</div>
            : lpLoading
              ? <div className="flex justify-center py-12"><Spinner /></div>
              : lp ? <Heatmap data={lp} anzeige={anzeige} /> : null
          }
        </div>
      )}

      {rb && (
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Bedarf nach Tätigkeit</h2>
          <TaetigkeitenBedarf data={rb} />
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
