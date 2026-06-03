import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, getLuecken, einreichen, entsperren } from "../../api/teilnehmer";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";

function LueckenModal({ luecken, onZurueck, onEinreichen }) {
  return (
    <Modal title="Mögliche Lücken gefunden" onClose={onZurueck} wide>
      <p className="text-sm text-slate-600 mb-4">Vor dem Einreichen haben wir folgende mögliche Lücken gefunden:</p>
      <table className="w-full text-sm mb-6">
        <thead><tr className="bg-slate-50"><th className="table-th">Tag</th><th className="table-th">Datum</th><th className="table-th">Lücke</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {luecken.map((l, i) => (
            <tr key={i}><td className="table-td">{l.tag}</td><td className="table-td">{l.datum}</td><td className="table-td">{l.luecke}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onZurueck}>Zurück zur Erfassung</button>
        <button className="btn-primary" onClick={onEinreichen}>Trotzdem einreichen</button>
      </div>
    </Modal>
  );
}

function ConfirmEinreichen({ onConfirm, onCancel }) {
  return (
    <Modal title="Einträge einreichen" onClose={onCancel}>
      <p className="text-sm text-slate-600 mb-6">
        Möchtest du alle deine Einträge definitiv einreichen? Nach dem Einreichen kannst du deine Einträge nur noch einsehen, aber selbst wieder entsperren falls du Korrekturen vornehmen musst.
      </p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onCancel}>Abbrechen</button>
        <button className="btn-primary" onClick={onConfirm}>Einreichen</button>
      </div>
    </Modal>
  );
}

export default function TnDashboard() {
  const { gruppeId } = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep]   = useState(null); // null | "luecken" | "bestaetigen"
  const [luecken, setLuecken] = useState([]);
  const [msg, setMsg]     = useState("");

  const load = () => {
    setLoading(true);
    getDashboard(gruppeId).then(({ data: d, error: e }) => {
      setLoading(false);
      if (e) setError(e); else setData(d);
    });
  };

  useEffect(load, [gruppeId]);

  const handleEinreichenStart = async () => {
    const { data: lData } = await getLuecken(gruppeId);
    if (lData && lData.length > 0) { setLuecken(lData); setStep("luecken"); }
    else setStep("bestaetigen");
  };

  const handleEinreichen = async () => {
    const { error: e } = await einreichen(gruppeId);
    setStep(null);
    if (e) { setError(e); return; }
    setMsg("Deine Einträge wurden erfolgreich eingereicht.");
    load();
  };

  const handleEntsperre = async () => {
    const { error: e } = await entsperren(gruppeId);
    if (e) { setError(e); return; }
    load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;
  if (!data)   return <Alert>{error}</Alert>;

  const { gruppe, status, gesamt_stunden, kategorien, tage_mit_eintraegen, arbeitstage_gesamt } = data;
  const kannEinreichen = status === "OFFEN" || status === "IN_BEARBEITUNG";
  const maxMin = Math.max(1, ...kategorien.map(k => k.minuten));

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{gruppe.name}</h1>
        <p className="text-sm text-slate-500">{gruppe.zeitraum_von} – {gruppe.zeitraum_bis}</p>
      </div>

      {error && <Alert>{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {/* Status */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <StatusBadge status={status} />
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Erfasst</p>
          <p className="font-semibold text-slate-800">{gesamt_stunden}h · {tage_mit_eintraegen}/{arbeitstage_gesamt} Tage</p>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <Link to="/tn/kalender" className="btn-secondary flex-1 text-center">Zur Kalenderansicht</Link>
        {kannEinreichen && (
          <button className="btn-primary flex-1" onClick={handleEinreichenStart}>Einreichen</button>
        )}
        {status === "EINGEREICHT" && (
          <button className="btn-secondary flex-1" onClick={handleEntsperre}>Entsperren</button>
        )}
      </div>

      {/* Kategorien-Balken */}
      {kategorien.length > 0 && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Zeitanteile</h2>
          {kategorien.sort((a, b) => b.minuten - a.minuten).map(k => (
            <div key={k.kategorie.id} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: k.kategorie.farbe ?? "#ccc" }} />
              <span className="text-xs text-slate-600 w-48 truncate">{k.kategorie.name}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(k.minuten / maxMin) * 100}%`, background: k.kategorie.farbe ?? "#3B82F6" }} />
              </div>
              <span className="text-xs text-slate-500 w-16 text-right">{(k.minuten / 60).toFixed(1)}h</span>
            </div>
          ))}
        </div>
      )}

      {step === "luecken" && (
        <LueckenModal luecken={luecken} onZurueck={() => setStep(null)} onEinreichen={() => setStep("bestaetigen")} />
      )}
      {step === "bestaetigen" && (
        <ConfirmEinreichen onConfirm={handleEinreichen} onCancel={() => setStep(null)} />
      )}
    </div>
  );
}
