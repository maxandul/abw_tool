import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getGruppen, createGruppe, updateGruppe, deleteGruppe,
  abschliessenGruppe, wiederoeffnenGruppe
} from "../../api/admin";
import AppLinkHint from "../../components/AppLinkHint";
import TeilnehmerPinHint from "../../components/TeilnehmerPinHint";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { fmtDate } from "../../utils/format";

function GruppeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { name: "", zeitraum_von: "", zeitraum_bis: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await onSave(form);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Tipp:</strong> Lege pro Standort eine eigene Erhebung an. Mehrere Erhebungen können in der Auswertung später zusammengefasst werden.
      </div>
      <div>
        <label className="label">Name der Erhebung *</label>
        <input className="input" value={form.name} onChange={set("name")} required placeholder="z.B. Standort Zürich" />
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
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    getGruppen(true).then(({ data, error: e }) => {
      setLoading(false);
      if (e) setError(e); else setGruppen(data);
    });
  };

  useEffect(load, []);

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

  const handleAbschliessen = async (id) => {
    await abschliessenGruppe(id); setConfirm(null); load();
  };

  const handleWiederoeffnen = async (id) => {
    await wiederoeffnenGruppe(id); setConfirm(null); load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Erhebungen</h1>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Erhebung anlegen</button>
      </div>

      {error && <Alert>{error}</Alert>}

      <AppLinkHint />
      <TeilnehmerPinHint />

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Zeitraum</th>
              <th className="table-th">Teilnehmer</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gruppen.map(g => (
              <tr key={g.id} className={!g.aktiv ? "opacity-50" : ""}>
                <td className="table-td font-medium">{g.name}</td>
                <td className="table-td text-xs">{fmtDate(g.zeitraum_von)}<br />{fmtDate(g.zeitraum_bis)}</td>
                <td className="table-td">{g.stats?.anzahl_teilnehmer ?? "–"}</td>
                <td className="table-td">
                  {!g.aktiv
                    ? <span className="badge bg-slate-100 text-slate-500">Archiviert</span>
                    : g.abgeschlossen
                      ? <span className="badge bg-amber-100 text-amber-700">Abgeschlossen</span>
                      : <span className="badge bg-green-100 text-green-700">Offen</span>
                  }
                </td>
                <td className="table-td">
                  <div className="flex gap-2 flex-wrap">
                    {g.aktiv && <button className="btn-secondary text-xs" onClick={() => setModal({ id: g.id, gruppe: g })}>Bearbeiten</button>}
                    <Link to={`/admin/gruppen/${g.id}/teilnehmer`} className="btn-ghost text-xs">Teilnehmer</Link>
                    <Link to={`/admin/auswertung?gruppe_id=${g.id}`} className="btn-ghost text-xs">Auswertung</Link>
                    {g.aktiv && !g.abgeschlossen && (
                      <button className="btn-ghost text-xs text-amber-700"
                        onClick={() => setConfirm({ type: "abschliessen", id: g.id, name: g.name })}>
                        Abschliessen
                      </button>
                    )}
                    {g.aktiv && g.abgeschlossen && (
                      <button className="btn-ghost text-xs text-green-700"
                        onClick={() => setConfirm({ type: "wiederoeffnen", id: g.id, name: g.name })}>
                        Wieder öffnen
                      </button>
                    )}
                    {g.aktiv && g.abgeschlossen && (
                      <button className="btn-ghost text-xs text-red-600"
                        onClick={() => setConfirm({ type: "deactivate", id: g.id, name: g.name })}>
                        Archivieren
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {gruppen.length === 0 && (
              <tr><td colSpan={5} className="table-td text-center text-slate-500 py-8">Noch keine Erhebungen vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === "create" && (
        <Modal title="Neue Erhebung anlegen" onClose={() => setModal(null)}>
          <GruppeForm onSave={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.id && (
        <Modal title="Erhebung bearbeiten" onClose={() => setModal(null)}>
          <GruppeForm initial={modal.gruppe} onSave={handleUpdate(modal.id)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {confirm?.type === "abschliessen" && (
        <ConfirmDialog
          title="Erhebung abschliessen"
          message={`Erhebung «${confirm.name}» abschliessen? Teilnehmende können danach keine Einträge mehr erfassen. Du kannst die Erhebung jederzeit wieder öffnen.`}
          confirmLabel="Abschliessen"
          confirmClass="btn-primary"
          onConfirm={() => handleAbschliessen(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "wiederoeffnen" && (
        <ConfirmDialog
          title="Erhebung wieder öffnen"
          message={`Erhebung «${confirm.name}» wieder öffnen? Teilnehmende können danach erneut Einträge erfassen.`}
          confirmLabel="Wieder öffnen"
          confirmClass="btn-primary"
          onConfirm={() => handleWiederoeffnen(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "deactivate" && (
        <ConfirmDialog
          title="Erhebung archivieren"
          message={`Erhebung «${confirm.name}» wirklich archivieren? Die Erhebung kann nicht wieder aktiviert werden. Alle Daten bleiben erhalten.`}
          confirmLabel="Archivieren"
          confirmClass="btn-danger"
          onConfirm={() => handleDeactivate(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
