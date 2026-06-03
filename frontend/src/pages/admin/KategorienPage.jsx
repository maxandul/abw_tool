import { useEffect, useState } from "react";
import {
  getKategorien, getRaumtypen, createKategorie, updateKategorie, deleteKategorie
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

function KategorieForm({ initial, raumtypen, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial ?? { name: "", beschreibung: "", farbe: "#4472C4", raumtyp_id: "", sort_order: 0 }
  );
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
      <div>
        <label className="label">Name *</label>
        <input className="input" value={form.name} onChange={set("name")} required />
      </div>
      <div>
        <label className="label">Beschreibung</label>
        <textarea className="input min-h-[80px]" value={form.beschreibung ?? ""} onChange={set("beschreibung")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Farbe</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.farbe ?? "#4472C4"}
              onChange={e => setForm(f => ({ ...f, farbe: e.target.value }))}
              className="h-9 w-12 rounded border border-slate-300 p-0.5 cursor-pointer" />
            <input className="input flex-1" value={form.farbe ?? ""} onChange={set("farbe")} maxLength={7} placeholder="#RRGGBB" />
          </div>
        </div>
        <div>
          <label className="label">Raumtyp</label>
          <select className="input" value={form.raumtyp_id ?? ""} onChange={set("raumtyp_id")}>
            <option value="">Kein Raumtyp</option>
            {raumtypen.filter(r => r.aktiv).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Sortierung</label>
        <input className="input" type="number" value={form.sort_order ?? 0} onChange={set("sort_order")} />
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

export default function KategorienPage() {
  const [kategorien, setKategorien] = useState([]);
  const [raumtypen, setRaumtypen]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [modal, setModal]           = useState(null);
  const [confirm, setConfirm]       = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getKategorien(), getRaumtypen()]).then(([k, r]) => {
      setLoading(false);
      if (k.error) setError(k.error);
      else { setKategorien(k.data); setRaumtypen(r.data ?? []); }
    });
  };
  useEffect(load, []);

  const handleCreate = async (form) => {
    const { error: err } = await createKategorie(form);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleUpdate = (id, modus) => async (form) => {
    const { error: err } = await updateKategorie(id, form, modus);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleDeactivate = async (id) => {
    await deleteKategorie(id); setConfirm(null); load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Kategorien</h1>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Kategorie anlegen</button>
      </div>
      {error && <Alert>{error}</Alert>}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th w-8"></th>
              <th className="table-th">Name</th>
              <th className="table-th">Raumtyp</th>
              <th className="table-th">Einträge</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {kategorien.map(k => (
              <tr key={k.id} className={!k.aktiv ? "opacity-50" : ""}>
                <td className="table-td">
                  <span className="inline-block w-5 h-5 rounded" style={{ background: k.farbe ?? "#ccc" }} />
                </td>
                <td className="table-td font-medium">{k.name}</td>
                <td className="table-td text-xs text-slate-500">{k.raumtyp_name ?? "–"}</td>
                <td className="table-td">{k.anzahl_eintraege}</td>
                <td className="table-td">
                  <span className={`badge ${k.aktiv ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {k.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs"
                      onClick={() => setModal({ id: k.id, kategorie: k })}>Bearbeiten</button>
                    {k.aktiv && (
                      <button className="btn-ghost text-xs text-red-600"
                        onClick={() => setConfirm({ id: k.id, name: k.name, count: k.anzahl_eintraege })}>
                        Deaktivieren
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === "create" && (
        <Modal title="Neue Kategorie" onClose={() => setModal(null)}>
          <KategorieForm raumtypen={raumtypen} onSave={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.id && !modal.modus && (
        <Modal title="Kategorie bearbeiten" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Bestehende Einträge verweisen auf diese Kategorie. Möchtest du sie überschreiben oder eine neue erstellen?
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setModal(m => ({ ...m, modus: "ueberschreiben" }))}>Überschreiben</button>
              <button className="btn-secondary flex-1" onClick={() => setModal(m => ({ ...m, modus: "neu" }))}>Neue Kategorie</button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.id && modal.modus && (
        <Modal title={modal.modus === "neu" ? "Neue Kategorie erstellen" : "Kategorie bearbeiten"} onClose={() => setModal(null)}>
          <KategorieForm initial={modal.kategorie} raumtypen={raumtypen}
            onSave={handleUpdate(modal.id, modal.modus)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title="Kategorie deaktivieren"
          message={`«${confirm.name}» deaktivieren? ${confirm.count > 0 ? `${confirm.count} Einträge verweisen auf diese Kategorie und bleiben unverändert.` : ""}`}
          onConfirm={() => handleDeactivate(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
