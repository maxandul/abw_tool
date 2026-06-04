import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pinAendern } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

export default function PinAendernPage() {
  const { user, chooseGruppe, setMeineGruppen } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ neuer_pin: "", bestaetigung: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: err } = await pinAendern(form);
    setLoading(false);
    if (err) { setError(err); return; }

    if (user?.rolle === "ADMIN") {
      navigate("/admin/dashboard");
      return;
    }

    const gruppen = (data?.gruppen || []);
    setMeineGruppen(gruppen);
    navigate("/tn/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card w-full max-w-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Neuen PIN setzen</h2>
        <p className="text-sm text-slate-500 mb-4">
          Dein PIN wurde zurückgesetzt. Bitte wähle jetzt einen neuen PIN.
        </p>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div>
            <label className="label">Neuer PIN</label>
            <input className="input" type="password" autoComplete="new-password"
              value={form.neuer_pin} onChange={set("neuer_pin")} required />
          </div>
          <div>
            <label className="label">PIN bestätigen</label>
            <input className="input" type="password" autoComplete="new-password"
              value={form.bestaetigung} onChange={set("bestaetigung")} required />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "PIN speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
