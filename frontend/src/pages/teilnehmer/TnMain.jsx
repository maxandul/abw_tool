import { useEffect, useState } from "react";
import { getMeineGruppen, getDashboard, getLuecken, einreichen, entsperren } from "../../api/teilnehmer";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import Kalender from "./Kalender";
import { fmtDate } from "../../utils/format";

// ── Dashboard-Kachel pro Erhebung ────────────────────────────────────────────
function ErhebungKachel({ gruppe, onKalender }) {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(null);
  const [luecken, setLuecken] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    getDashboard(gruppe.id).then(({ data, error: e }) => {
      setLoading(false);
      if (e) setErr(e); else setDash(data);
    });
  };
  useEffect(load, [gruppe.id]);

  const handleEinreichenStart = async () => {
    const { data: lData } = await getLuecken(gruppe.id);
    if (lData && lData.length > 0) { setLuecken(lData); setStep("luecken"); }
    else setStep("bestaetigen");
  };

  const handleEinreichen = async () => {
    const { error: e } = await einreichen(gruppe.id);
    setStep(null);
    if (e) { setErr(e); return; }
    setMsg("Einträge erfolgreich eingereicht."); load();
  };

  const handleEntsperre = async () => {
    const { error: e } = await entsperren(gruppe.id);
    if (e) { setErr(e); return; }
    setMsg(""); load();
  };

  if (loading) return <div className="card flex justify-center py-8"><Spinner /></div>;
  if (!dash) return <div className="card"><Alert>{err}</Alert></div>;

  const { status, gesamt_stunden, tage_mit_eintraegen, arbeitstage_gesamt, kategorien } = dash;
  const offen      = gruppe.aktiv && !gruppe.abgeschlossen;
  const kannEinreichen = offen && (status === "OFFEN" || status === "IN_BEARBEITUNG");
  const kannEntsperre  = offen && status === "EINGEREICHT";
  const maxMin = Math.max(1, ...(kategorien || []).map(k => k.minuten));

  return (
    <div className="card space-y-4">
      {err && <Alert>{err}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{gruppe.name}</h3>
          <p className="text-xs text-slate-500">{fmtDate(gruppe.zeitraum_von)} – {fmtDate(gruppe.zeitraum_bis)}</p>
          {gruppe.abgeschlossen && (
            <span className="badge bg-amber-100 text-amber-700 mt-1">Abgeschlossen</span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span>Erfasst: <strong>{gesamt_stunden}h</strong></span>
        <span>Tage: <strong>{tage_mit_eintraegen}/{arbeitstage_gesamt}</strong></span>
      </div>

      {/* Kategorie-Balken */}
      {(kategorien || []).length > 0 && (
        <div className="space-y-1.5">
          {kategorien.sort((a, b) => b.minuten - a.minuten).slice(0, 5).map(k => (
            <div key={k.kategorie.id} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: k.kategorie.farbe ?? "#ccc" }} />
              <span className="text-xs text-slate-600 w-36 truncate">{k.kategorie.name}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${(k.minuten / maxMin) * 100}%`, background: k.kategorie.farbe ?? "#3B82F6" }} />
              </div>
              <span className="text-xs text-slate-500 w-12 text-right">{(k.minuten / 60).toFixed(1)}h</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {offen && (
          <button className="btn-secondary text-sm flex-1" onClick={() => onKalender(gruppe)}>
            Tätigkeit erfassen
          </button>
        )}
        {!offen && (
          <button className="btn-ghost text-sm flex-1" onClick={() => onKalender(gruppe)}>
            Einträge ansehen
          </button>
        )}
        {kannEinreichen && (
          <button className="btn-primary text-sm flex-1" onClick={handleEinreichenStart}>Einreichen</button>
        )}
        {kannEntsperre && (
          <button className="btn-secondary text-sm flex-1" onClick={handleEntsperre}>Änderung vornehmen</button>
        )}
      </div>

      {step === "luecken" && (
        <Modal title="Mögliche Lücken" onClose={() => setStep(null)} wide>
          <p className="text-sm text-slate-600 mb-4">Folgende mögliche Lücken wurden gefunden:</p>
          <table className="w-full text-sm mb-6">
            <thead><tr className="bg-slate-50">
              <th className="table-th">Tag</th><th className="table-th">Datum</th><th className="table-th">Lücke</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {luecken.map((l, i) => (
                <tr key={i}>
                  <td className="table-td">{l.tag}</td>
                  <td className="table-td">{fmtDate(l.datum)}</td>
                  <td className="table-td">{l.luecke}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setStep(null)}>Zurück</button>
            <button className="btn-primary" onClick={() => setStep("bestaetigen")}>Trotzdem einreichen</button>
          </div>
        </Modal>
      )}
      {step === "bestaetigen" && (
        <Modal title="Einträge einreichen" onClose={() => setStep(null)}>
          <p className="text-sm text-slate-600 mb-6">
            Möchtest du deine Einträge für <strong>{gruppe.name}</strong> definitiv einreichen?
          </p>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setStep(null)}>Abbrechen</button>
            <button className="btn-primary" onClick={handleEinreichen}>Einreichen</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TnMain() {
  const [gruppen, setGruppen] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    getMeineGruppen().then(({ data, error: e }) => {
      if (e) setError(e);
      else setGruppen(data ?? []);
    });
  }, []);

  if (!gruppen) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (error) return <div className="max-w-xl mx-auto p-6"><Alert>{error}</Alert></div>;

  const tabCls = (id) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === id
        ? "border-brand-600 text-brand-700"
        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
    }`;

  const activeGruppe = gruppen.find(g => g.id === activeTab);

  return (
    <div className="min-h-screen">
      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-0 overflow-x-auto">
          <button className={tabCls("dashboard")} onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </button>
          {gruppen.map(g => (
            <button key={g.id} className={tabCls(g.id)} onClick={() => setActiveTab(g.id)}>
              {g.name}
              {g.abgeschlossen && <span className="ml-1.5 text-xs text-amber-600">(abgeschl.)</span>}
              {!g.aktiv && <span className="ml-1.5 text-xs text-slate-400">(archiviert)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && (
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <h1 className="text-2xl font-bold text-slate-800">Meine Erhebungen</h1>
          {gruppen.length === 0 && (
            <div className="card text-center text-slate-500 py-12">
              Du bist noch keiner Erhebung zugeordnet. Bitte wende dich an den Administrator.
            </div>
          )}
          {gruppen.map(g => (
            <ErhebungKachel key={g.id} gruppe={g}
              onKalender={(g) => setActiveTab(g.id)} />
          ))}
        </div>
      )}

      {activeGruppe && (
        <Kalender
          gruppeId={activeGruppe.id}
          zeitraumVon={activeGruppe.zeitraum_von}
          zeitraumBis={activeGruppe.zeitraum_bis}
          abgeschlossen={activeGruppe.abgeschlossen || !activeGruppe.aktiv}
        />
      )}
    </div>
  );
}
