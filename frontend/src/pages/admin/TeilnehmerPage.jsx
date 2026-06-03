import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fmtDate } from "../../utils/format";
import {
  getTeilnehmer, addTeilnehmer, removeTeilnehmer, resetPin, setEinreichungStatus
} from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";

export default function TeilnehmerPage() {
  const { gruppeId } = useParams();
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addResult, setAddResult] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    getTeilnehmer(gruppeId).then(({ data, error: e }) => {
      setLoading(false);
      if (e) setError(e); else setList(data);
    });
  };
  useEffect(load, [gruppeId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const { data, error: err } = await addTeilnehmer(gruppeId, { email: addEmail });
    if (err) { setError(err); return; }
    setAddResult(data);
    setAddEmail("");
    load();
  };

  const handleRemove = async (uId) => {
    await removeTeilnehmer(gruppeId, uId);
    setConfirm(null); load();
  };

  const handleReset = async (uId) => {
    const { data } = await resetPin(uId);
    setConfirm(null);
    if (data?.temporaerer_pin) alert(`Neuer temporärer PIN: ${data.temporaerer_pin}`);
    load();
  };

  const handleStatus = async (uId, status) => {
    const { error: err } = await setEinreichungStatus(uId, gruppeId, { status });
    if (err) { setError(err); return; }
    load();
  };

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Teilnehmer</h1>
      {error && <Alert>{error}</Alert>}

      {/* Hinzufügen */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Teilnehmer manuell hinzufügen</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input className="input flex-1" type="email" placeholder="E-Mail-Adresse"
            value={addEmail} onChange={e => setAddEmail(e.target.value)} required />
          <button type="submit" className="btn-primary">Hinzufügen</button>
        </form>
        {addResult && (
          <div className="mt-3">
            <Alert type="success">
              {addResult.user.email} hinzugefügt.
              {addResult.temporaerer_pin && ` Temporärer PIN: `}
              {addResult.temporaerer_pin && <strong>{addResult.temporaerer_pin}</strong>}
            </Alert>
          </div>
        )}
      </div>

      {/* Tabelle */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-th">E-Mail</th>
              <th className="table-th">Status</th>
              <th className="table-th">Einträge</th>
              <th className="table-th">Letzter Eintrag</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(tn => (
              <tr key={tn.user_id}>
                <td className="table-td">
                  <span className="font-medium">{tn.email}</span>
                  {tn.pin_temporaer && <span className="ml-2 badge bg-amber-100 text-amber-700">Temp-PIN</span>}
                </td>
                <td className="table-td"><StatusBadge status={tn.status} /></td>
                <td className="table-td">{tn.anzahl_eintraege}</td>
                <td className="table-td text-xs text-slate-500">{fmtDate(tn.letzter_eintrag)}</td>
                <td className="table-td">
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn-ghost text-xs" onClick={() => setConfirm({ type: "pin", id: tn.user_id, email: tn.email })}>
                      PIN reset
                    </button>
                    {tn.status === "EINGEREICHT" && (
                      <button className="btn-ghost text-xs text-amber-600"
                        onClick={() => handleStatus(tn.user_id, "IN_BEARBEITUNG")}>
                        Entsperren
                      </button>
                    )}
                    {tn.status === "IN_BEARBEITUNG" && (
                      <button className="btn-ghost text-xs text-green-700"
                        onClick={() => handleStatus(tn.user_id, "ABGESCHLOSSEN")}>
                        Abschliessen
                      </button>
                    )}
                    <button className="btn-ghost text-xs text-red-600"
                      onClick={() => setConfirm({ type: "remove", id: tn.user_id, email: tn.email })}>
                      Entfernen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="table-td text-center text-slate-500 py-8">Noch keine Teilnehmer in dieser Gruppe.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm?.type === "remove" && (
        <ConfirmDialog
          title="Teilnehmer entfernen"
          message={`${confirm.email} aus dieser Gruppe entfernen? Die Einträge bleiben für die Auswertung erhalten.`}
          onConfirm={() => handleRemove(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "pin" && (
        <ConfirmDialog
          title="PIN zurücksetzen"
          message={`PIN von ${confirm.email} zurücksetzen? Ein neuer temporärer PIN wird generiert.`}
          confirmLabel="PIN zurücksetzen"
          confirmClass="btn-primary"
          onConfirm={() => handleReset(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
