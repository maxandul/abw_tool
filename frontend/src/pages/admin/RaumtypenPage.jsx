import { useEffect, useState } from "react";
import { getRaumtypen, createRaumtyp, updateRaumtyp, deleteRaumtyp, reactivateRaumtyp } from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

function RaumtypForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { name: "", beschreibung: "", sort_order: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await onSave(form);
    setLoading(false); if (err) setError(err);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set("name")} required /></div>
      <div><label className="label">Beschreibung</label><textarea className="input min-h-[80px]" value={form.beschreibung ?? ""} onChange={set("beschreibung")} /></div>
      <div><label className="label">Sortierung</label><input className="input" type="number" value={form.sort_order ?? 0} onChange={set("sort_order")} /></div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? <Spinner size="sm" /> : "Speichern"}</button>
      </div>
    </form>
  );
}

export default function RaumtypenPage() {
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    getRaumtypen().then(({ data, error: e }) => { setLoading(false); if (e) setError(e); else setList(data); });
  };
  useEffect(load, []);

  const handleCreate = async (form) => {
    const { error: err } = await createRaumtyp(form);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };
  const handleUpdate = (id) => async (form) => {
    const { error: err } = await updateRaumtyp(id, form);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };
  const handleDeactivate = async (id) => {
    const { error: err } = await deleteRaumtyp(id);
    if (err) { setError(err); }
    setConfirm(null); load();
  };

  const handleReactivate = async (id) => {
    await reactivateRaumtyp(id); load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Raumtypen</h1>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Raumtyp anlegen</button>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Beschreibung</th>
              <th className="table-th">Kategorien</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(r => (
              <tr key={r.id} className={!r.aktiv ? "opacity-50" : ""}>
                <td className="table-td font-medium">{r.name}</td>
                <td className="table-td text-xs text-slate-500">{r.beschreibung ?? "–"}</td>
                <td className="table-td">{r.anzahl_kategorien}</td>
                <td className="table-td">
                  <span className={`badge ${r.aktiv ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {r.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs" onClick={() => setModal({ id: r.id, raumtyp: r })}>Bearbeiten</button>
                    {r.aktiv ? (
                      <button className="btn-ghost text-xs text-red-600"
                        onClick={() => setConfirm({ id: r.id, name: r.name })}>Deaktivieren</button>
                    ) : (
                      <button className="btn-ghost text-xs text-green-700"
                        onClick={() => handleReactivate(r.id)}>Reaktivieren</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal === "create" && <Modal title="Neuer Raumtyp" onClose={() => setModal(null)}><RaumtypForm onSave={handleCreate} onCancel={() => setModal(null)} /></Modal>}
      {modal?.id && <Modal title="Raumtyp bearbeiten" onClose={() => setModal(null)}><RaumtypForm initial={modal.raumtyp} onSave={handleUpdate(modal.id)} onCancel={() => setModal(null)} /></Modal>}
      {confirm && <ConfirmDialog title="Raumtyp deaktivieren" message={`«${confirm.name}» deaktivieren?`} onConfirm={() => handleDeactivate(confirm.id)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
