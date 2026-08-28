import { useEffect, useRef, useState } from "react";
import {
  getKategorien, createKategorie, updateKategorie, deleteKategorie,
  reactivateKategorie, reorderKategorien,
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import Farbauswahl from "../../components/Farbauswahl";
import {
  ARBEITSFORM_ORDER, ARBEITSFORM_LABELS, ARBEITSORT_OPTS, GRUPPENGROESSE_OPTS,
  TEILNEHMERKREIS_OPTS, RUECKZUGSBEDARF_OPTS, ABWESENHEIT_GRUND_OPTS,
  showArbeitsort, showGruppengroesse, showTeilnehmerkreis, showRueckzugsbedarf,
  showAbwesenheitGrund, defaultFarbeForArbeitsform, formatTaetigkeitMeta,
  groupKategorien,
} from "../../utils/taetigkeiten";

const ARBEITSFORM_OPTS = ARBEITSFORM_ORDER.map(v => ({ value: v, label: ARBEITSFORM_LABELS[v] }));

const OFFEN_LABELS = {
  arbeitsort: "Arbeitsort",
  rueckzugsbedarf: "Rückzugsbedarf",
  gruppengroesse: "Gruppengrösse",
  teilnehmerkreis: "Teilnehmendenkreis",
};

function Select({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label className="label">
        {label} {required
          ? "*"
          : <span className="text-slate-400 font-normal">(optional – sonst von Teilnehmenden erfasst)</span>}
      </label>
      <select className="input" value={value ?? ""} onChange={onChange} required={required}>
        <option value="" disabled={required}>{required ? "– auswählen –" : "– keine Angabe –"}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TaetigkeitForm({ initial, defaultArbeitsform, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? "",
    beschreibung: initial?.beschreibung ?? "",
    farbe: initial?.farbe ?? defaultFarbeForArbeitsform(initial?.arbeitsform ?? defaultArbeitsform),
    arbeitsform: initial?.arbeitsform ?? defaultArbeitsform,
    arbeitsort: initial?.arbeitsort ?? "",
    gruppengroesse: initial?.gruppengroesse ?? "",
    teilnehmerkreis: initial?.teilnehmerkreis ?? "",
    rueckzugsbedarf: initial?.rueckzugsbedarf ?? "",
    abwesenheit_grund: initial?.abwesenheit_grund ?? "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onArbeitsformChange = (e) => {
    const arbeitsform = e.target.value;
    setForm(f => ({
      ...f,
      arbeitsform,
      farbe: defaultFarbeForArbeitsform(arbeitsform),
      arbeitsort: "", gruppengroesse: "", teilnehmerkreis: "",
      rueckzugsbedarf: "", abwesenheit_grund: "",
    }));
  };

  const onArbeitsortChange = (e) => {
    const arbeitsort = e.target.value;
    setForm(f => ({
      ...f,
      arbeitsort,
      // Rückzugsbedarf entfällt bei allen Arbeitsorten ausser dem üblichen
      // Arbeitsplatz/Standort – bereits gesetzte Werte werden dann verworfen.
      rueckzugsbedarf: arbeitsort === "UEBLICHER_ARBEITSPLATZ" ? f.rueckzugsbedarf : "",
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
          arbeitsform={form.arbeitsform}
          value={form.farbe}
          onChange={hex => setForm(f => ({ ...f, farbe: hex }))}
        />
      </div>
      <div>
        <label className="label">Arbeitsform *</label>
        <select className="input" value={form.arbeitsform} onChange={onArbeitsformChange}>
          {ARBEITSFORM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {showArbeitsort(form.arbeitsform) && (
        <Select label="Arbeitsort" value={form.arbeitsort} onChange={onArbeitsortChange} options={ARBEITSORT_OPTS} />
      )}
      {showGruppengroesse(form.arbeitsform) && (
        <Select label="Gruppengrösse" value={form.gruppengroesse} onChange={set("gruppengroesse")} options={GRUPPENGROESSE_OPTS} />
      )}
      {showTeilnehmerkreis(form.arbeitsform) && (
        <Select label="Teilnehmendenkreis" value={form.teilnehmerkreis} onChange={set("teilnehmerkreis")} options={TEILNEHMERKREIS_OPTS} />
      )}
      {showRueckzugsbedarf(form.arbeitsform, form.arbeitsort) && (
        <Select label="Rückzugsbedarf" value={form.rueckzugsbedarf} onChange={set("rueckzugsbedarf")} options={RUECKZUGSBEDARF_OPTS} />
      )}
      {showAbwesenheitGrund(form.arbeitsform) && (
        <Select label="Grund" value={form.abwesenheit_grund} onChange={set("abwesenheit_grund")}
          options={ABWESENHEIT_GRUND_OPTS} required />
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Speichern"}
        </button>
      </div>
    </form>
  );
}

function KategorieRow({ k, draggable, dragHandlers, dragOver, onEdit, onDeactivate, onReactivate }) {
  return (
    <tr
      draggable={draggable}
      onDragStart={draggable ? dragHandlers.onDragStart(k.id) : undefined}
      onDragOver={draggable ? dragHandlers.onDragOver(k.id) : undefined}
      onDrop={draggable ? dragHandlers.onDrop(k.id) : undefined}
      className={`${!k.aktiv ? "opacity-50" : ""} ${dragOver ? "bg-brand-50" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <td className="table-td w-10 sticky left-0 z-10 bg-white">
        <span className="inline-block w-5 h-5 rounded" style={{ background: k.farbe ?? "#ccc" }} />
      </td>
      <td className="table-td font-medium sticky left-10 z-10 bg-white border-r border-slate-100">{k.name}</td>
      <td className="table-td text-xs text-slate-500 whitespace-normal min-w-[220px]">
        {formatTaetigkeitMeta(k) || "–"}
        {k.offene_merkmale?.length > 0 && (
          <div className="text-brand-600 mt-0.5">
            Von Teilnehmenden zu erfassen: {k.offene_merkmale.map(f => OFFEN_LABELS[f]).join(", ")}
          </div>
        )}
      </td>
      <td className="table-td text-xs text-slate-500 whitespace-normal min-w-[220px]">{k.beschreibung || "–"}</td>
      <td className="table-td">{k.anzahl_eintraege}</td>
      <td className="table-td">
        <span className={`badge ${k.aktiv ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
          {k.aktiv ? "Aktiv" : "Inaktiv"}
        </span>
      </td>
      <td className="table-td">
        <div className="flex gap-2">
          {onEdit && <button className="btn-ghost text-xs" onClick={() => onEdit(k)}>Bearbeiten</button>}
          {k.aktiv ? (
            <button className="btn-ghost text-xs text-red-600" onClick={() => onDeactivate(k)}>Deaktivieren</button>
          ) : (
            <button className="btn-ghost text-xs text-green-700" onClick={() => onReactivate(k.id)}>Reaktivieren</button>
          )}
        </div>
      </td>
    </tr>
  );
}

function KategorienTable({ groups, draggableGroups, onReorderGroup, onEdit, onDeactivate, onReactivate }) {
  const dragId = useRef(null);
  const [overId, setOverId] = useState(null);

  const makeHandlers = (groupItems, groupKey) => ({
    onDragStart: (id) => (e) => { dragId.current = id; e.dataTransfer.effectAllowed = "move"; },
    onDragOver: (id) => (e) => { e.preventDefault(); setOverId(id); },
    onDrop: (id) => (e) => {
      e.preventDefault();
      const fromId = dragId.current;
      dragId.current = null;
      setOverId(null);
      if (fromId == null || fromId === id) return;
      const ids = groupItems.map(i => i.id);
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(id);
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, fromId);
      onReorderGroup(groupKey, ids);
    },
  });

  if (!groups.length) return <p className="text-sm text-slate-400 px-4 py-6">Keine Tätigkeiten vorhanden.</p>;

  return (
    <div className="space-y-6">
      {groups.map(g => {
        const handlers = makeHandlers(g.items, g.key);
        return (
          <div key={g.key}>
            <h3 className="text-sm font-semibold text-slate-600 px-1 mb-1">{g.label}</h3>
            <div className="card overflow-x-auto p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-th w-10 sticky left-0 z-20 bg-slate-50" />
                    <th className="table-th sticky left-10 z-20 bg-slate-50">Name</th>
                    <th className="table-th min-w-[200px]">Merkmale</th>
                    <th className="table-th min-w-[220px]">Beschreibung</th>
                    <th className="table-th">Einträge</th>
                    <th className="table-th">Status</th>
                    <th className="table-th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.items.map(k => (
                    <KategorieRow
                      key={k.id}
                      k={k}
                      draggable={draggableGroups}
                      dragHandlers={handlers}
                      dragOver={overId === k.id}
                      onEdit={draggableGroups ? onEdit : null}
                      onDeactivate={onDeactivate}
                      onReactivate={onReactivate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {draggableGroups && (
        <p className="text-xs text-slate-400 px-1">Ziehe eine Zeile, um die Reihenfolge innerhalb einer Arbeitsform zu ändern.</p>
      )}
    </div>
  );
}

export default function KategorienPage() {
  const [kategorien, setKategorien] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    getKategorien().then(({ data, error: err }) => {
      setLoading(false);
      if (err) setError(err);
      else setKategorien(data ?? []);
    });
  };
  useEffect(load, []);

  const aktuelle = kategorien.filter(k => !k.ist_legacy);
  const legacy = kategorien.filter(k => k.ist_legacy);
  const aktuelleGruppen = groupKategorien(aktuelle);
  const legacyGruppen = groupKategorien(legacy);

  const handleCreate = async (form) => {
    const anzahlInGruppe = aktuelle.filter(k => k.arbeitsform === form.arbeitsform).length;
    const { error: err } = await createKategorie({ ...form, sort_order: (anzahlInGruppe + 1) * 10 });
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleUpdate = (id, modus) => async (form) => {
    const { error: err } = await updateKategorie(id, form, modus);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleDeactivate = async (k) => {
    await deleteKategorie(k.id); setConfirm(null); load();
  };
  const handleReactivate = async (id) => {
    await reactivateKategorie(id); load();
  };
  const handleReorder = async (arbeitsform, ids) => {
    // Optimistic local reorder so the drag feels instant.
    setKategorien(prev => {
      const order = new Map(ids.map((id, i) => [id, i]));
      return [...prev].sort((a, b) => {
        if (a.arbeitsform !== arbeitsform || b.arbeitsform !== arbeitsform) return 0;
        return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
      }).map(k => (k.arbeitsform === arbeitsform ? { ...k, sort_order: (order.get(k.id) ?? 0) * 10 } : k));
    });
    await reorderKategorien(arbeitsform, ids);
    load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tätigkeiten</h1>
        <button className="btn-primary" onClick={() => setModal("create")}>+ Tätigkeit anlegen</button>
      </div>
      {error && <Alert>{error}</Alert>}

      <KategorienTable
        groups={aktuelleGruppen}
        draggableGroups
        onReorderGroup={handleReorder}
        onEdit={(k) => setModal({ id: k.id, kategorie: k })}
        onDeactivate={(k) => setConfirm({ id: k.id, name: k.name, count: k.anzahl_eintraege })}
        onReactivate={handleReactivate}
      />

      {legacyGruppen.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-sm font-semibold text-slate-500 select-none">
            Archiv (bisheriges System) – {legacy.length} Tätigkeit{legacy.length === 1 ? "" : "en"}
          </summary>
          <p className="text-xs text-slate-400 mt-2 mb-3">
            Diese Tätigkeiten stammen aus der ersten Erhebung (altes System). Sie können nicht mehr bearbeitet
            und für neue Einträge nicht mehr ausgewählt werden – bestehende Einträge und Auswertungen bleiben
            davon unberührt.
          </p>
          <div className="mt-2">
            <KategorienTable
              groups={legacyGruppen}
              draggableGroups={false}
              onDeactivate={(k) => setConfirm({ id: k.id, name: k.name, count: k.anzahl_eintraege })}
              onReactivate={handleReactivate}
            />
          </div>
        </details>
      )}

      {modal === "create" && (
        <Modal title="Neue Tätigkeit" onClose={() => setModal(null)}>
          <TaetigkeitForm defaultArbeitsform="EINZELARBEIT" onSave={handleCreate} onCancel={() => setModal(null)} />
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
          onConfirm={() => handleDeactivate(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
