import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAdmins, createAdmin, resetAdminPin, deleteAdmin } from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import ConfirmDialog from "../../components/ConfirmDialog";
import Modal from "../../components/Modal";

// ── PIN-Anzeige-Modal ────────────────────────────────────────────────────────
function PinModal({ title, email, pin, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-4">
        Bitte den temporären PIN notieren und an <strong>{email}</strong> weitergeben.
        Der PIN wird nur einmal angezeigt. Beim nächsten Login wird die Person aufgefordert,
        einen eigenen PIN zu setzen.
      </p>
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <span className="text-3xl font-mono font-bold tracking-widest text-brand-600 flex-1 text-center">
          {pin}
        </span>
        <button type="button" onClick={copy}
          className="btn-secondary text-xs shrink-0">
          {copied ? "Kopiert ✓" : "Kopieren"}
        </button>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="btn-primary">Verstanden</button>
      </div>
    </Modal>
  );
}

// ── Neuer-Admin-Modal ────────────────────────────────────────────────────────
function NeuerAdminModal({ onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { data, error: err } = await createAdmin({ email });
    setLoading(false);
    if (err) { setError(err); return; }
    onCreated(data);
  };

  return (
    <Modal title="Neuer Admin" onClose={onClose}>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">E-Mail-Adresse</label>
          <input className="input" type="email" autoFocus required
            value={email} onChange={e => setEmail(e.target.value)}
            autoComplete="off" />
        </div>
        <p className="text-xs text-slate-500">
          Ein temporärer PIN wird generiert. Die Person muss ihn beim ersten Login ändern.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Admin anlegen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminsPage() {
  const { user: me } = useAuth();
  const [admins, setAdmins]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showNew, setShowNew]   = useState(false);
  const [pinModal, setPinModal] = useState(null); // { title, email, pin }
  const [confirm, setConfirm]   = useState(null); // { id, email }

  const load = () => {
    setLoading(true);
    getAdmins().then(({ data, error: e }) => {
      setLoading(false);
      if (e) setError(e); else setAdmins(data);
    });
  };
  useEffect(load, []);

  const handleCreated = ({ user, temp_pin }) => {
    setShowNew(false);
    load();
    setPinModal({ title: "Admin angelegt", email: user.email, pin: temp_pin });
  };

  const handlePinReset = async (admin) => {
    const { data, error: e } = await resetAdminPin(admin.id);
    if (e) { setError(e); return; }
    setPinModal({ title: "PIN zurückgesetzt", email: admin.email, pin: data.temp_pin });
  };

  const handleDelete = async () => {
    const { error: e } = await deleteAdmin(confirm.id);
    setConfirm(null);
    if (e) setError(e); else load();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Administratoren</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ Neuer Admin</button>
      </div>

      {error && <Alert onClose={() => setError("")}>{error}</Alert>}

      {loading
        ? <div className="flex justify-center mt-12"><Spinner size="lg" /></div>
        : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-th">E-Mail</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map(a => {
                  const isMe = a.id === me?.id;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="table-td font-medium">
                        {a.email}
                        {isMe && <span className="ml-2 badge bg-brand-100 text-brand-600">Du</span>}
                      </td>
                      <td className="table-td">
                        {a.pin_temporaer
                          ? <span className="badge bg-amber-100 text-amber-700">PIN temporär</span>
                          : <span className="badge bg-green-100 text-green-700">Aktiv</span>
                        }
                      </td>
                      <td className="table-td text-right">
                        <div className="flex justify-end gap-2">
                          <button className="btn-ghost text-xs"
                            onClick={() => handlePinReset(a)}>
                            PIN zurücksetzen
                          </button>
                          <button
                            className="btn-ghost text-xs text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={() => !isMe && setConfirm({ id: a.id, email: a.email })}
                            disabled={isMe}
                            title={isMe ? "Eigenen Account nicht löschbar" : ""}>
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {showNew && (
        <NeuerAdminModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}

      {pinModal && (
        <PinModal
          title={pinModal.title}
          email={pinModal.email}
          pin={pinModal.pin}
          onClose={() => setPinModal(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Admin löschen"
          message={`Admin «${confirm.email}» wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          confirmLabel="Löschen"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
