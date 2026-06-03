import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setup } from "../api/auth";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

export default function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", pin: "", pin_bestaetigung: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await setup(form);
    setLoading(false);
    if (err) { setError(err); return; }
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold text-brand-600 mb-1">Tätigkeitserhebung</h1>
        <p className="text-sm text-slate-500 mb-6">Erstmalige Einrichtung – Admin-Account anlegen</p>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">E-Mail-Adresse</label>
            <input className="input" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div>
            <label className="label">PIN wählen</label>
            <input className="input" type="password" value={form.pin} onChange={set("pin")} required placeholder="mind. 4 Zeichen" />
          </div>
          <div>
            <label className="label">PIN bestätigen</label>
            <input className="input" type="password" value={form.pin_bestaetigung} onChange={set("pin_bestaetigung")} required />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Admin-Account anlegen"}
          </button>
        </form>
      </div>
    </div>
  );
}
