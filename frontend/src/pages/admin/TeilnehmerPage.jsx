import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fmtDate } from "../../utils/format";
import { CSV_TEMPLATE, downloadCsv, parseTeilnehmerCsv } from "../../utils/csv";
import { TEILNEHMER_TEMP_PIN } from "../../constants";
import AppLinkHint from "../../components/AppLinkHint";
import TeilnehmerPinHint from "../../components/TeilnehmerPinHint";
import {
  getTeilnehmer,
  addTeilnehmer,
  updateTeilnehmer,
  importTeilnehmer,
  removeTeilnehmer,
  resetPin,
  setEinreichungStatus,
  getGruppe,
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";

const EMPTY_FORM = {
  email: "",
  vorname: "",
  nachname: "",
  funktion: "",
  organisationseinheit: "",
  beschaeftigungsgrad: "100",
};

function TeilnehmerForm({ initial, onSave, onCancel, emailReadonly = false }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await onSave(form);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div>
        <label className="label">E-Mail *</label>
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={set("email")}
          required
          readOnly={emailReadonly}
          disabled={emailReadonly}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Vorname</label>
          <input className="input" value={form.vorname} onChange={set("vorname")} />
        </div>
        <div>
          <label className="label">Nachname</label>
          <input className="input" value={form.nachname} onChange={set("nachname")} />
        </div>
      </div>
      <div>
        <label className="label">Funktion</label>
        <input className="input" value={form.funktion} onChange={set("funktion")} />
      </div>
      <div>
        <label className="label">Organisationseinheit</label>
        <input
          className="input"
          value={form.organisationseinheit}
          onChange={set("organisationseinheit")}
        />
      </div>
      <div>
        <label className="label">Beschäftigungsgrad (%)</label>
        <input
          className="input"
          type="number"
          min="1"
          max="100"
          step="1"
          value={form.beschaeftigungsgrad}
          onChange={set("beschaeftigungsgrad")}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Speichern"}
        </button>
      </div>
    </form>
  );
}

function displayName(tn) {
  const name = [tn.vorname, tn.nachname].filter(Boolean).join(" ");
  return name || "–";
}

export default function TeilnehmerPage() {
  const { gruppeId } = useParams();
  const [list, setList] = useState([]);
  const [gruppe, setGruppe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addResult, setAddResult] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getTeilnehmer(gruppeId), getGruppe(gruppeId)]).then(([tn, g]) => {
      setLoading(false);
      if (tn.error) setError(tn.error);
      else setList(tn.data);
      if (g.data) setGruppe(g.data);
    });
  };

  useEffect(load, [gruppeId]);

  const handleAdd = async (form) => {
    const { data, error: err } = await addTeilnehmer(gruppeId, form);
    if (err) return { error: err };
    setAddResult(data);
    load();
    return {};
  };

  const handleEdit = async (form) => {
    const { error: err } = await updateTeilnehmer(gruppeId, editModal.user_id, form);
    if (err) return { error: err };
    setEditModal(null);
    load();
    return {};
  };

  const handleRemove = async (uId) => {
    await removeTeilnehmer(gruppeId, uId);
    setConfirm(null);
    load();
  };

  const handleReset = async (uId) => {
    await resetPin(uId);
    setConfirm(null);
    load();
  };

  const handleStatus = async (uId, status) => {
    const { error: err } = await setEinreichungStatus(uId, gruppeId, { status });
    if (err) setError(err);
    else load();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseTeilnehmerCsv(String(reader.result ?? ""));
      setImportPreview({ rows, parseErrors: errors, fileName: file.name });
      setImportResult(null);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!importPreview?.rows?.length) return;
    setImportLoading(true);
    setError("");
    const { data, error: err } = await importTeilnehmer(gruppeId, importPreview.rows);
    setImportLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setImportResult(data);
    setImportPreview(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Teilnehmer</h1>
        {gruppe && (
          <span className="text-base text-slate-500 font-normal">
            Erhebung: <strong className="text-slate-700">{gruppe.name}</strong>
            {" · "}
            {fmtDate(gruppe.zeitraum_von)} – {fmtDate(gruppe.zeitraum_bis)}
          </span>
        )}
      </div>
      {error && <Alert>{error}</Alert>}

      <AppLinkHint />
      <TeilnehmerPinHint />

      {/* CSV-Import */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Massenerfassung (CSV)</h2>
        <p className="text-sm text-slate-500">
          SAP-Export als CSV (Semikolon-getrennt, UTF-8) hochladen. Bereits erfasste
          Teilnehmer werden anhand der E-Mail aktualisiert.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => downloadCsv("teilnehmer_vorlage.csv", CSV_TEMPLATE)}
          >
            Vorlage herunterladen
          </button>
          <label className="btn-primary text-sm cursor-pointer">
            CSV-Datei wählen
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
        {importResult && (
          <div className="space-y-2">
            <Alert type="success">
              Import abgeschlossen: {importResult.erstellt} neu erfasst,{" "}
              {importResult.aktualisiert} aktualisiert
              {importResult.neue_accounts > 0 &&
                ` (${importResult.neue_accounts} neue Accounts mit PIN ${TEILNEHMER_TEMP_PIN})`}
              {importResult.fehler?.length > 0 &&
                `, ${importResult.fehler.length} Fehler`}
              .
            </Alert>
            {importResult.fehler?.length > 0 && (
              <ul className="text-sm text-red-600 list-disc list-inside">
                {importResult.fehler.map((f, i) => (
                  <li key={i}>
                    Zeile {f.zeile}
                    {f.email ? ` (${f.email})` : ""}: {f.fehler}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Manuell hinzufügen */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Teilnehmer manuell hinzufügen
        </h2>
        <TeilnehmerForm initial={EMPTY_FORM} onSave={handleAdd} />
        {addResult && (
          <div className="mt-3">
            <Alert type="success">
              {addResult.updated ? "Aktualisiert" : "Hinzugefügt"}: {addResult.user.email}
              {addResult.temporaerer_pin && (
                <>
                  {" "}
                  · Temporärer PIN:{" "}
                  <strong className="font-mono">{TEILNEHMER_TEMP_PIN}</strong>
                </>
              )}
            </Alert>
          </div>
        )}
      </div>

      {/* Tabelle */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">E-Mail</th>
              <th className="table-th">Funktion</th>
              <th className="table-th">OE</th>
              <th className="table-th">%</th>
              <th className="table-th">Status</th>
              <th className="table-th">Einträge</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((tn) => (
              <tr key={tn.user_id}>
                <td className="table-td font-medium">{displayName(tn)}</td>
                <td className="table-td text-sm">
                  {tn.email}
                  {tn.pin_temporaer && (
                    <span className="ml-2 badge bg-amber-100 text-amber-700">
                      PIN {TEILNEHMER_TEMP_PIN}
                    </span>
                  )}
                </td>
                <td className="table-td text-sm text-slate-600">{tn.funktion || "–"}</td>
                <td className="table-td text-sm text-slate-600">
                  {tn.organisationseinheit || "–"}
                </td>
                <td className="table-td text-sm">{tn.beschaeftigungsgrad ?? 100}</td>
                <td className="table-td">
                  <StatusBadge status={tn.status} />
                </td>
                <td className="table-td">{tn.anzahl_eintraege}</td>
                <td className="table-td">
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      className="btn-ghost text-xs text-brand-600"
                      to={`/admin/gruppen/${gruppeId}/teilnehmer/${tn.user_id}/eintraege`}
                    >
                      Einträge
                    </Link>
                    <button
                      className="btn-ghost text-xs"
                      onClick={() =>
                        setEditModal({
                          user_id: tn.user_id,
                          form: {
                            email: tn.email,
                            vorname: tn.vorname ?? "",
                            nachname: tn.nachname ?? "",
                            funktion: tn.funktion ?? "",
                            organisationseinheit: tn.organisationseinheit ?? "",
                            beschaeftigungsgrad: String(tn.beschaeftigungsgrad ?? 100),
                          },
                        })
                      }
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn-ghost text-xs"
                      onClick={() =>
                        setConfirm({ type: "pin", id: tn.user_id, email: tn.email })
                      }
                    >
                      PIN reset
                    </button>
                    {tn.status === "EINGEREICHT" && (
                      <button
                        className="btn-ghost text-xs text-amber-600"
                        onClick={() => handleStatus(tn.user_id, "IN_BEARBEITUNG")}
                      >
                        Entsperren
                      </button>
                    )}
                    {tn.status === "IN_BEARBEITUNG" && (
                      <button
                        className="btn-ghost text-xs text-green-700"
                        onClick={() => handleStatus(tn.user_id, "ABGESCHLOSSEN")}
                      >
                        Abschliessen
                      </button>
                    )}
                    <button
                      className="btn-ghost text-xs text-red-600"
                      onClick={() =>
                        setConfirm({ type: "remove", id: tn.user_id, email: tn.email })
                      }
                    >
                      Entfernen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="table-td text-center text-slate-500 py-8">
                  Noch keine Teilnehmer in dieser Erhebung.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {importPreview && (
        <Modal
          title={`Import-Vorschau – ${importPreview.fileName}`}
          onClose={() => setImportPreview(null)}
        >
          <div className="space-y-4">
            {importPreview.parseErrors.length > 0 && (
              <Alert>
                {importPreview.parseErrors.map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              </Alert>
            )}
            <p className="text-sm text-slate-600">
              <strong>{importPreview.rows.length}</strong> gültige Zeilen zum Importieren.
            </p>
            {importPreview.rows.length > 0 && (
              <div className="overflow-x-auto max-h-64 border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="table-th">E-Mail</th>
                      <th className="table-th">Name</th>
                      <th className="table-th">Funktion</th>
                      <th className="table-th">OE</th>
                      <th className="table-th">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.rows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className="table-td">{r.email}</td>
                        <td className="table-td">
                          {[r.vorname, r.nachname].filter(Boolean).join(" ") || "–"}
                        </td>
                        <td className="table-td">{r.funktion || "–"}</td>
                        <td className="table-td">{r.organisationseinheit || "–"}</td>
                        <td className="table-td">{r.beschaeftigungsgrad || "100"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.rows.length > 20 && (
                  <p className="text-xs text-slate-400 p-2">
                    … und {importPreview.rows.length - 20} weitere Zeilen
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setImportPreview(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={importPreview.rows.length === 0 || importLoading}
                onClick={handleImport}
              >
                {importLoading ? <Spinner size="sm" /> : "Import starten"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal title="Teilnehmer bearbeiten" onClose={() => setEditModal(null)}>
          <TeilnehmerForm
            initial={editModal.form}
            emailReadonly
            onSave={handleEdit}
            onCancel={() => setEditModal(null)}
          />
        </Modal>
      )}

      {confirm?.type === "remove" && (
        <ConfirmDialog
          title="Teilnehmer entfernen"
          message={`${confirm.email} aus dieser Erhebung entfernen? Die Einträge bleiben für die Auswertung erhalten.`}
          onConfirm={() => handleRemove(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "pin" && (
        <ConfirmDialog
          title="PIN zurücksetzen"
          message={`PIN von ${confirm.email} auf den temporären PIN ${TEILNEHMER_TEMP_PIN} zurücksetzen? Die Person muss beim nächsten Login einen neuen PIN wählen.`}
          confirmLabel="PIN zurücksetzen"
          confirmClass="btn-primary"
          onConfirm={() => handleReset(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
