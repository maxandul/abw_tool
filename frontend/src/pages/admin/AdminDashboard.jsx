import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, abschliessenGruppe, wiederoeffnenGruppe, deleteGruppe } from "../../api/admin";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import ConfirmDialog from "../../components/ConfirmDialog";
import { fmtDate, workingDays, fmtMinuten } from "../../utils/format";

const BAR_COLORS = { OFFEN: "bg-slate-300", EINGEREICHT: "bg-brand-500" };
const BAR_LABELS = { OFFEN: "Offen", EINGEREICHT: "Eingereicht" };

function ProgressBar({ counts, total }) {
  if (!total) return <div className="h-1.5 bg-slate-100 rounded-full" />;
  const eingereicht = counts?.EINGEREICHT ?? 0;
  const offen       = counts?.OFFEN       ?? 0;
  const einPct  = Math.min(100, (eingereicht / total) * 100);
  const offPct  = Math.min(100, (offen       / total) * 100);
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex bg-slate-100">
      <div className="h-full bg-brand-600 transition-all shrink-0"
        style={{ width: `${einPct}%` }} title={`Eingereicht: ${eingereicht}`} />
      <div className="h-full bg-slate-300 transition-all shrink-0"
        style={{ width: `${offPct}%` }} title={`Offen: ${offen}`} />
    </div>
  );
}

function StatusChip({ g }) {
  if (!g.aktiv) return <span className="badge bg-slate-100 text-slate-500">Archiviert</span>;
  if (g.abgeschlossen) return <span className="badge bg-amber-100 text-amber-700">Abgeschlossen</span>;
  return <span className="badge bg-green-100 text-green-700">Offen</span>;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    getDashboard().then(({ data: d, error: e }) => {
      if (e) setError(e); else setData(d);
    });
  };
  useEffect(load, []);

  const handleAbschliessen = async (id) => {
    await abschliessenGruppe(id); setConfirm(null); load();
  };
  const handleWiederoeffnen = async (id) => {
    await wiederoeffnenGruppe(id); setConfirm(null); load();
  };
  const handleArchivieren = async (id) => {
    await deleteGruppe(id); setConfirm(null); load();
  };

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  const total    = data.gruppen.length;
  const offen    = data.gruppen.filter(g => g.aktiv && !g.abgeschlossen).length;
  const abgeschl = data.gruppen.filter(g => g.aktiv && g.abgeschlossen).length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Erhebungen total",         total],
          ["Offene Erhebungen",         offen],
          ["Abgeschlossene Erhebungen", abgeschl],
        ].map(([label, val]) => (
          <div key={label} className="card text-center">
            <div className="text-3xl font-bold text-brand-600">{val}</div>
            <div className="text-sm text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Erhebungs-Karten */}
      <div className="space-y-4">
        {data.gruppen.map(g => {
          const counts      = g.stats.status_counts;
          const anz         = g.stats.anzahl_teilnehmer;
          const tage        = workingDays(g.zeitraum_von, g.zeitraum_bis);
          const erwartetMin = anz * tage * 8.4 * 60;        // 8.4h per person per working day
          const erfasstMin  = g.stats.total_minuten_erfasst ?? 0;
          const pct         = erwartetMin > 0 ? Math.min(100, Math.round((erfasstMin / erwartetMin) * 100)) : 0;
          return (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-semibold text-slate-800">{g.name}</h2>
                    <StatusChip g={g} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {fmtDate(g.zeitraum_von)} – {fmtDate(g.zeitraum_bis)} · {anz} Teilnehmer · {tage} Arbeitstage
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Link to={`/admin/gruppen/${g.id}/teilnehmer`} className="btn-secondary text-xs">Teilnehmer</Link>
                  <Link to={`/admin/auswertung?gruppe_id=${g.id}`} className="btn-ghost text-xs">Auswertung</Link>
                  {g.aktiv && !g.abgeschlossen && (
                    <button className="btn-ghost text-xs text-amber-700"
                      onClick={() => setConfirm({ type: "abschliessen", id: g.id, name: g.name })}>
                      Abschliessen
                    </button>
                  )}
                  {g.aktiv && g.abgeschlossen && (
                    <>
                      <button className="btn-ghost text-xs text-green-700"
                        onClick={() => setConfirm({ type: "wiederoeffnen", id: g.id, name: g.name })}>
                        Wieder öffnen
                      </button>
                      <button className="btn-ghost text-xs text-red-600"
                        onClick={() => setConfirm({ type: "archivieren", id: g.id, name: g.name })}>
                        Archivieren
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Submission progress */}
              <ProgressBar counts={counts} total={anz} />
              <div className="flex gap-4 mt-1.5 mb-3">
                {["OFFEN", "EINGEREICHT"].map(k => (
                  <span key={k} className="text-xs text-slate-500">
                    {BAR_LABELS[k]}: <strong>{counts[k] ?? 0}</strong>
                  </span>
                ))}
              </div>

              {/* Time recording progress */}
              {anz > 0 && (
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-slate-500">
                      Erfasste Zeit: <strong>{fmtMinuten(erfasstMin)}</strong>
                      <span className="text-slate-400"> / {fmtMinuten(Math.round(erwartetMin))} erwartet</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {data.gruppen.length === 0 && (
          <div className="card text-center text-slate-500 py-12">
            Noch keine Erhebungen vorhanden.{" "}
            <Link to="/admin/gruppen" className="text-brand-600 underline">Erhebung anlegen →</Link>
          </div>
        )}
      </div>

      {confirm?.type === "abschliessen" && (
        <ConfirmDialog
          title="Erhebung abschliessen"
          message={`Erhebung «${confirm.name}» abschliessen? Teilnehmende können danach keine Einträge mehr erfassen. Du kannst die Erhebung jederzeit wieder öffnen.`}
          confirmLabel="Abschliessen"
          confirmClass="btn-primary"
          onConfirm={() => handleAbschliessen(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "wiederoeffnen" && (
        <ConfirmDialog
          title="Erhebung wieder öffnen"
          message={`Erhebung «${confirm.name}» wieder öffnen? Teilnehmende können danach erneut Einträge erfassen.`}
          confirmLabel="Wieder öffnen"
          confirmClass="btn-primary"
          onConfirm={() => handleWiederoeffnen(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "archivieren" && (
        <ConfirmDialog
          title="Erhebung archivieren"
          message={`Erhebung «${confirm.name}» wirklich archivieren? Die Erhebung kann nicht wieder aktiviert werden. Alle Daten bleiben erhalten.`}
          confirmLabel="Archivieren"
          confirmClass="btn-danger"
          onConfirm={() => handleArchivieren(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
