import { useEffect, useRef, useState } from "react";
import {
  getKategorien, createKategorie, updateKategorie, deleteKategorie, reactivateKategorie
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import Farbauswahl from "../../components/Farbauswahl";
import {
  TAETIGKEITSGRUPPE_LABELS,
  TAETIGKEITSGRUPPE_ORDER,
  defaultFarbeForGruppe,
} from "../../utils/taetigkeiten";

const GRUPPE_OPTS = TAETIGKEITSGRUPPE_ORDER.map(v => ({
  value: v,
  label: TAETIGKEITSGRUPPE_LABELS[v],
}));

function TaetigkeitForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? "",
    beschreibung: initial?.beschreibung ?? "",
    farbe: initial?.farbe ?? defaultFarbeForGruppe(initial?.taetigkeitsgruppe ?? "EINZELARBEIT"),
    taetigkeitsgruppe: initial?.taetigkeitsgruppe ?? "EINZELARBEIT",
    sort_order: initial?.sort_order ?? 0,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onGruppeChange = (e) => {
    const gruppe = e.target.value;
    setForm(f => ({
      ...f,
      taetigkeitsgruppe: gruppe,
      farbe: defaultFarbeForGruppe(gruppe),
    }));
  };

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
      <div>
        <label className="label">Farbe</label>
        <Farbauswahl
          gruppe={form.taetigkeitsgruppe}
          value={form.farbe}
          onChange={hex => setForm(f => ({ ...f, farbe: hex }))}
        />
      </div>
      <div>
        <label className="label">Tätigkeitsgruppe *</label>
        <select className="input" value={form.taetigkeitsgruppe} onChange={onGruppeChange}>
          {GRUPPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const scrollRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onDragStart = (e) => {
    if (e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
    scrollRef.current.style.cursor = "grabbing";
  };
  const onDragMove = (e) => {
    if (!drag.current.active) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  };
  const onDragEnd = () => {
    drag.current.active = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "";
  };

  const load = () => {
    setLoading(true);
    getKategorien().then(({ data, error: err }) => {
      setLoading(false);
      if (err) setError(err);
      else setKategorien(data ?? []);
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

  const handleReactivate = async (id) => {
    await reactivateKategorie(id); load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tätigkeiten</h1>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Tätigkeit anlegen</button>
      </div>
      {error && <Alert>{error}</Alert>}

      <div className="card overflow-x-auto p-0 select-none" ref={scrollRef}
        onMouseDown={onDragStart} onMouseMove={onDragMove}
        onMouseUp={onDragEnd} onMouseLeave={onDragEnd}>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th w-10 sticky left-0 z-20 bg-slate-50" />
              <th className="table-th sticky left-10 z-20 bg-slate-50">Name</th>
              <th className="table-th min-w-[200px]">Gruppe</th>
              <th className="table-th min-w-[220px]">Beschreibung</th>
              <th className="table-th">Einträge</th>
              <th className="table-th">Status</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {kategorien.map(k => (
              <tr key={k.id} className={!k.aktiv ? "opacity-50" : ""}>
                <td className="table-td sticky left-0 z-10 bg-white">
                  <span className="inline-block w-5 h-5 rounded" style={{ background: k.farbe ?? "#ccc" }} />
                </td>
                <td className="table-td font-medium sticky left-10 z-10 bg-white border-r border-slate-100">{k.name}</td>
                <td className="table-td text-xs text-slate-500">
                  <div>{k.taetigkeitsgruppe_label ?? TAETIGKEITSGRUPPE_LABELS[k.taetigkeitsgruppe]}</div>
                </td>
                <td className="table-td text-xs text-slate-500 whitespace-normal min-w-[220px]">
                  {k.beschreibung || "–"}
                </td>
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
                    {k.aktiv ? (
                      <button className="btn-ghost text-xs text-red-600"
                        onClick={() => setConfirm({ id: k.id, name: k.name, count: k.anzahl_eintraege })}>
                        Deaktivieren
                      </button>
                    ) : (
                      <button className="btn-ghost text-xs text-green-700"
                        onClick={() => handleReactivate(k.id)}>
                        Reaktivieren
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
        <Modal title="Neue Tätigkeit" onClose={() => setModal(null)}>
          <TaetigkeitForm onSave={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.id && !modal.modus && (
        <Modal title="Tätigkeit bearbeiten" onClose={() => setModal(null)}>
          {modal.kategorie.anzahl_eintraege > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Diese Tätigkeit wurde in <strong>{modal.kategorie.anzahl_eintraege} Einträgen</strong> bereits verwendet.
                Möchtest du sie überschreiben (bestehende Einträge werden aktualisiert) oder eine neue Tätigkeit erstellen?
              </p>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setModal(m => ({ ...m, modus: "ueberschreiben" }))}>Überschreiben</button>
                <button className="btn-secondary flex-1" onClick={() => setModal(m => ({ ...m, modus: "neu" }))}>Neue Tätigkeit</button>
              </div>
            </div>
          ) : (
            <TaetigkeitForm initial={modal.kategorie}
              onSave={handleUpdate(modal.id, "ueberschreiben")} onCancel={() => setModal(null)} />
          )}
        </Modal>
      )}
      {modal?.id && modal.modus && (
        <Modal title={modal.modus === "neu" ? "Neue Tätigkeit erstellen" : "Tätigkeit bearbeiten"} onClose={() => setModal(null)}>
          <TaetigkeitForm initial={modal.kategorie}
            onSave={handleUpdate(modal.id, modal.modus)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title="Tätigkeit deaktivieren"
          message={`«${confirm.name}» deaktivieren? ${confirm.count > 0 ? `${confirm.count} Einträge verweisen auf diese Tätigkeit und bleiben unverändert.` : ""}`}
          onConfirm={() => handleDeactivate(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
