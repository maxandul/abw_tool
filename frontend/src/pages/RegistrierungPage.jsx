import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { registrierenInfo, registrieren } from "../api/auth";
import { fmtDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

export default function RegistrierungPage() {
  const { token } = useParams();
  const { setUser, chooseGruppe } = useAuth();
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [form, setForm] = useState({ email: "", pin: "", pin_bestaetigung: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    registrierenInfo(token).then(({ data, error: err }) => {
      if (err) { setInfoError(err); return; }
      setInfo(data);
    });
  }, [token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: err } = await registrieren({ token, ...form });
    setLoading(false);
    if (err) { setError(err); return; }
    setUser(data.user);
    chooseGruppe(data.gruppe_id);
    navigate("/tn/kalender");
  };

  if (infoError) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-sm w-full"><Alert>{infoError}</Alert></div>
    </div>
  );

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold text-brand-600 mb-1">Registrierung</h1>
        <div className="bg-slate-50 rounded-lg px-4 py-3 mb-5 text-sm">
          <p className="font-medium text-slate-700">{info.gruppe_name}</p>
          <p className="text-slate-500">
            Erhebungszeitraum: {fmtDate(info.zeitraum_von)} – {fmtDate(info.zeitraum_bis)}
          </p>
        </div>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div>
            <label className="label">E-Mail-Adresse</label>
            <input className="input" type="email" autoFocus autoComplete="off"
              value={form.email} onChange={set("email")} required />
          </div>
          <div>
            <label className="label">PIN wählen</label>
            <input className="input" type="password" autoComplete="new-password"
              value={form.pin} onChange={set("pin")} required />
          </div>
          <div>
            <label className="label">PIN bestätigen</label>
            <input className="input" type="password" autoComplete="new-password"
              value={form.pin_bestaetigung} onChange={set("pin_bestaetigung")} required />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Registrieren"}
          </button>
        </form>
      </div>
    </div>
  );
}
