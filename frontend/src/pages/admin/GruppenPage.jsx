import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getGruppen, createGruppe, updateGruppe, deleteGruppe, regenerateToken
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const RATIO_PRESETS = [
  { value: 1.0, label: "1:1 – Kein Sharing" },
  { value: 1.2, label: "1.2 – Standard" },
  { value: 1.4, label: "1.4 – Moderat" },
  { value: 1.6, label: "1.6 – Hoch" },
  { value: 2.0, label: "2.0 – Sehr hoch" },
];

function GruppeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { name: "", zeitraum_von: "", zeitraum_bis: "", sharing_ratio: 1.2 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customRatio, setCustomRatio] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await onSave(form);
    setLoading(false);
    if (err) setError(err);
  };

  const ratioIsPreset = RATIO_PRESETS.some(p => p.value === Number(form.sharing_ratio));

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div>
        <label className="label">Gruppenname *</label>
        <input className="input" value={form.name} onChange={set("name")} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Zeitraum von *</label>
          <input className="input" type="date" value={form.zeitraum_von} onChange={set("zeitraum_von")} required />
        </div>
        <div>
          <label className="label">Zeitraum bis *</label>
          <input className="input" type="date" value={form.zeitraum_bis} onChange={set("zeitraum_bis")} required />
        </div>
      </div>
      <div>
        <label className="label">Sharing-Ratio</label>
        <select className="input mb-1"
          value={ratioIsPreset && !customRatio ? Number(form.sharing_ratio) : "custom"}
          onChange={e => {
            if (e.target.value === "custom") { setCustomRatio(true); }
            else { setCustomRatio(false); setForm(f => ({ ...f, sharing_ratio: Number(e.target.value) })); }
          }}>
          {RATIO_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          <option value="custom">Eigener Wert…</option>
        </select>
        {customRatio && (
          <input className="input" type="number" step="0.1" min="0.1" value={form.sharing_ratio}
            onChange={set("sharing_ratio")} placeholder="z.B. 1.3" />
        )}
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Speichern"}
        </button>
      </div>
    </form>
  );
}

export default function GruppenPage() {
  const [gruppen, setGruppen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | {id, gruppe}
  const [confirm, setConfirm] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const load = () => {
    setLoading(true);
    getGruppen(true).then(({ data, error: e }) => {
      setLoading(false);
      if (e) setError(e); else setGruppen(data);
    });
  };

  useEffect(load, []);

  const copyLink = (token) => {
    const url = `${window.location.origin}/registrierung/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (form) => {
    const { error: err } = await createGruppe(form);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleUpdate = (id) => async (form) => {
    const { error: err } = await updateGruppe(id, form);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleDeactivate = async (id) => {
    await deleteGruppe(id);
    setConfirm(null); load();
  };

  const handleNewToken = async (id) => {
    await regenerateToken(id);
    load();
    setConfirm(null);
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Gruppen</h1>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Gruppe anlegen</button>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Zeitraum</th>
              <th className="table-th">Ratio</th>
              <th className="table-th">Teilnehmer</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gruppen.map(g => (
              <tr key={g.id} className={!g.aktiv ? "opacity-50" : ""}>
                <td className="table-td font-medium">{g.name}</td>
                <td className="table-td text-xs">{g.zeitraum_von}<br />{g.zeitraum_bis}</td>
                <td className="table-td">{g.sharing_ratio}</td>
                <td className="table-td">{g.stats?.anzahl_teilnehmer ?? "–"}</td>
                <td className="table-td">
                  <span className={`badge ${g.aktiv ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {g.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="table-td">
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn-secondary text-xs" onClick={() => setModal({ id: g.id, gruppe: g })}>Bearbeiten</button>
                    <button className="btn-ghost text-xs" onClick={() => copyLink(g.registrierung_link_token)}>
                      {copiedId === g.registrierung_link_token ? "Kopiert!" : "Link kopieren"}
                    </button>
                    <Link to={`/admin/gruppen/${g.id}/teilnehmer`} className="btn-ghost text-xs">Teilnehmer</Link>
                    {g.aktiv && (
                      <button className="btn-ghost text-xs text-red-600" onClick={() => setConfirm({ type: "deactivate", id: g.id, name: g.name })}>
                        Deaktivieren
                      </button>
                    )}
                    <button className="btn-ghost text-xs text-amber-600"
                      onClick={() => setConfirm({ type: "token", id: g.id, name: g.name })}>
                      Neuer Link
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {gruppen.length === 0 && (
              <tr><td colSpan={6} className="table-td text-center text-slate-500 py-8">Noch keine Gruppen vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === "create" && (
        <Modal title="Neue Gruppe anlegen" onClose={() => setModal(null)}>
          <GruppeForm onSave={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.id && (
        <Modal title="Gruppe bearbeiten" onClose={() => setModal(null)}>
          <GruppeForm initial={modal.gruppe} onSave={handleUpdate(modal.id)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {confirm?.type === "deactivate" && (
        <ConfirmDialog
          title="Gruppe deaktivieren"
          message={`Gruppe «${confirm.name}» wirklich deaktivieren? Alle Daten bleiben erhalten.`}
          onConfirm={() => handleDeactivate(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "token" && (
        <ConfirmDialog
          title="Neuen Registrierungslink generieren"
          message={`Der alte Link für «${confirm.name}» wird ungültig. Fortfahren?`}
          confirmLabel="Neuen Link generieren"
          confirmClass="btn-primary"
          onConfirm={() => handleNewToken(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
