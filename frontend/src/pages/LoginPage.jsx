import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setupStatus } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

export default function LoginPage() {
  const { setUser, chooseGruppe } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", pin: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // If no admin exists yet, redirect to setup automatically.
  useEffect(() => {
    setupStatus().then(({ data }) => {
      if (data && !data.admin_exists) navigate("/setup", { replace: true });
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: err } = await login(form);
    setLoading(false);
    if (err) { setError(err); return; }

    setUser(data.user);

    if (data.pin_temporaer) { navigate("/pin-aendern"); return; }

    if (data.user.rolle === "ADMIN") {
      navigate("/admin/dashboard");
      return;
    }

    const gruppen = (data.gruppen || []).filter(g => g.aktiv);
    if (gruppen.length === 1) {
      chooseGruppe(gruppen[0].id);
      navigate("/tn/dashboard");
    } else {
      navigate("/gruppen-auswahl", { state: { gruppen } });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold text-brand-600 mb-1">Tätigkeitserhebung</h1>
        <p className="text-sm text-slate-500 mb-6">Bitte melde dich an</p>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">E-Mail-Adresse</label>
            <input className="input" type="email" autoFocus value={form.email} onChange={set("email")} required />
          </div>
          <div>
            <label className="label">PIN</label>
            <input className="input" type="password" value={form.pin} onChange={set("pin")} required />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
