import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GruppenAuswahlPage() {
  const { chooseGruppe } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const gruppen = state?.gruppen ?? [];

  const pick = (id) => { chooseGruppe(id); navigate("/tn/dashboard"); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card w-full max-w-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Gruppe wählen</h2>
        <p className="text-sm text-slate-500 mb-4">In welcher Gruppe möchtest du Einträge erfassen?</p>
        <ul className="space-y-2">
          {gruppen.map(g => (
            <li key={g.id}>
              <button
                onClick={() => pick(g.id)}
                className="w-full text-left rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-800">{g.name}</span>
              </button>
            </li>
          ))}
          {gruppen.length === 0 && (
            <li className="text-sm text-slate-500">Keine aktiven Gruppen gefunden.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
