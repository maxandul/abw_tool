import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getGruppen } from "../../api/admin";
import { get } from "../../api/client";
import HistorischeAuswertung from "./HistorischeAuswertung";
import {
  mountDashboard,
  reportDataset,
} from "../../../../backend/services/activity_dashboard.js";
import dashboardSource from "../../../../backend/services/activity_dashboard.js?raw";
import dashboardCss from "../../../../backend/services/activity_dashboard.css?raw";
import "../../../../backend/services/activity_dashboard.css";

function exportHtml(data, state) {
  data = reportDataset(data, state);
  const safeJson = (value) =>
    JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  const source = dashboardSource.replace(/^export /gm, "");
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tätigkeitsauswertung</title><style>body{margin:0;padding:24px;background:#f8fafc}${dashboardCss}</style><main id="dashboard"></main><script>${source}\nmountDashboard(document.getElementById('dashboard'),${safeJson(data)},${safeJson(state)});</script></html>`;
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "taetigkeiten-auswertung.html";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Dashboard({ data }) {
  const root = useRef(null);
  const latestState = useRef({});
  useEffect(
    () =>
      mountDashboard(
        root.current,
        data,
        latestState.current,
        (state) => exportHtml(data, state),
        (state) => {
          latestState.current = state;
        },
      ),
    [data],
  );
  return <div ref={root} />;
}
export default function AuswertungPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("gruppe_id") || "";
  const [groups, setGroups] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [historical, setHistorical] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    getGruppen(true).then((r) => {
      if (active) {
        setGroups(r.data || []);
        if (r.error) setError(r.error);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setError("");
    setLoading(Boolean(id));
    if (id)
      get(
        `/api/auswertung/dashboard?gruppe_ids=${encodeURIComponent(id)}`,
      ).then((r) => {
        if (active) {
          setLoading(false);
          if (r.data) setData({ surveyId: id, payload: r.data });
          setError(r.error || "");
        }
      });
    return () => {
      active = false;
    };
  }, [id, refresh]);
  return (
    <div className="ad-page">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Auswertung</h1>
        <button
          className="btn-secondary"
          onClick={() => setHistorical((v) => !v)}
        >
          {historical
            ? "Neues Dashboard öffnen"
            : "Historische Auswertung öffnen"}
        </button>
      </div>
      {historical ? (
        <>
          <p className="mb-4 text-sm text-slate-600">
            Bisherige Auswertung für historische Erfassungsstrukturen. Neue
            Erhebungen im Dashboard auswerten.
          </p>
          <HistorischeAuswertung />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="flex-1 min-w-0">
              <label className="label" htmlFor="survey">
                Erhebung / Standort
              </label>
              <select
                id="survey"
                className="input"
                value={id}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  if (e.target.value) next.set("gruppe_id", e.target.value);
                  else next.delete("gruppe_id");
                  setParams(next);
                }}
              >
                <option value="">Erhebung auswählen</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                    {!g.aktiv
                      ? " (archiviert)"
                      : g.abgeschlossen
                        ? " (abgeschlossen)"
                        : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-secondary"
              disabled={!id || loading}
              onClick={() => setRefresh((n) => n + 1)}
            >
              Daten aktualisieren
            </button>
          </div>
          {!id && (
            <p className="card">
              Wähle die Erhebung des untersuchten Standorts. Das Dashboard zeigt
              Tätigkeitsanteile, durchschnittliche Personen und die Verteilung
              über die Wochenhalbtage.
            </p>
          )}
          {error && (
            <p role="alert" className="card text-red-700">
              {error}
            </p>
          )}
          {loading && <p role="status">Auswertung wird geladen …</p>}
          {data?.surveyId === id && <Dashboard key={id} data={data.payload} />}
        </>
      )}
    </div>
  );
}
