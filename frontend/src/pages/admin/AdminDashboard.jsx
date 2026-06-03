import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import StatusBadge from "../../components/StatusBadge";

const STATUS_KEYS = ["OFFEN", "EINGEREICHT", "IN_BEARBEITUNG", "ABGESCHLOSSEN"];
const STATUS_LABELS = { OFFEN: "Offen", EINGEREICHT: "Eingereicht", IN_BEARBEITUNG: "In Bearb.", ABGESCHLOSSEN: "Abgeschl." };
const STATUS_COLORS = { OFFEN: "bg-slate-300", EINGEREICHT: "bg-blue-400", IN_BEARBEITUNG: "bg-amber-400", ABGESCHLOSSEN: "bg-green-400" };

function ProgressBar({ counts, total }) {
  if (!total) return <div className="h-2 bg-slate-100 rounded-full" />;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {STATUS_KEYS.map(k => counts[k] > 0 && (
        <div key={k} className={`${STATUS_COLORS[k]} transition-all`}
          style={{ width: `${(counts[k] / total) * 100}%` }}
          title={`${STATUS_LABELS[k]}: ${counts[k]}`} />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(({ data: d, error: e }) => {
      if (e) setError(e); else setData(d);
    });
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* Gesamtübersicht */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Aktive Gruppen",  data.anzahl_aktive_gruppen],
          ["Teilnehmer total", data.anzahl_teilnehmer_total],
          ["Noch nichts erfasst", data.teilnehmer_ohne_eintraege],
        ].map(([label, val]) => (
          <div key={label} className="card text-center">
            <div className="text-3xl font-bold text-brand-600">{val}</div>
            <div className="text-sm text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Gruppen-Karten */}
      <div className="space-y-4">
        {data.gruppen.map(g => {
          const counts = g.stats.status_counts;
          const total = g.stats.anzahl_teilnehmer;
          return (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-slate-800">{g.name}</h2>
                  <p className="text-xs text-slate-500">{g.zeitraum_von} – {g.zeitraum_bis} · {total} Teilnehmer</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/gruppen/${g.id}/teilnehmer`} className="btn-secondary text-xs">Teilnehmer</Link>
                  <Link to={`/admin/auswertung?gruppe_id=${g.id}`} className="btn-primary text-xs">Auswertung</Link>
                </div>
              </div>
              <ProgressBar counts={counts} total={total} />
              <div className="flex gap-4 mt-2">
                {STATUS_KEYS.map(k => (
                  <span key={k} className="text-xs text-slate-500">
                    {STATUS_LABELS[k]}: <strong>{counts[k] ?? 0}</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {data.gruppen.length === 0 && (
          <div className="card text-center text-slate-500 py-12">
            Noch keine aktiven Gruppen. <Link to="/admin/gruppen" className="text-brand-600 underline">Gruppe anlegen →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
