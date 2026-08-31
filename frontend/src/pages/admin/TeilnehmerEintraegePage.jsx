import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getTnEintraegeKontext, getTnEintraege,
  createTnEintrag, updateTnEintrag, deleteTnEintrag,
} from "../../api/admin";
import { getKategorien } from "../../api/teilnehmer";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import StatusBadge from "../../components/StatusBadge";
import KalenderFixed from "../teilnehmer/KalenderFixed";

export default function TeilnehmerEintraegePage() {
  const params = useParams();
  const gruppeId = Number(params.gruppeId);
  const userId = Number(params.userId);

  const [kontext, setKontext] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getTnEintraegeKontext(gruppeId, userId).then(({ data, error: e }) => {
      if (e) setError(e); else setKontext(data);
    });
  }, [gruppeId, userId]);

  const api = useMemo(() => ({
    getEintraege: (gId, von, bis) => getTnEintraege(gId, userId, von, bis),
    createEintrag: (body) => createTnEintrag(gruppeId, userId, body),
    updateEintrag: (id, body) => updateTnEintrag(gruppeId, userId, id, body),
    deleteEintrag: (id) => deleteTnEintrag(gruppeId, userId, id),
    // Gleiche, auf die Erhebung zugeschnittene Kategorienliste wie im
    // Teilnehmer-Kalender (aktive, nicht-legacy Tätigkeiten, ggf. per
    // Gruppen-Zuordnung eingeschränkt) – nicht die volle Admin-Verwaltungsliste.
    getKategorien: (gId) => getKategorien(gId),
  }), [gruppeId, userId]);

  if (error) return <div className="max-w-xl mx-auto p-6"><Alert>{error}</Alert></div>;
  if (!kontext) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  const { gruppe, teilnehmer, einreichung } = kontext;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to={`/admin/gruppen/${gruppeId}/teilnehmer`}
            className="text-xs text-slate-400 hover:text-slate-600">
            ← Zurück zu den Teilnehmern
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">{teilnehmer.name}</h1>
          <p className="text-sm text-slate-500">
            {teilnehmer.email && <span>{teilnehmer.email} · </span>}
            Erhebung: {gruppe.name}
          </p>
        </div>
        {einreichung?.status && <StatusBadge status={einreichung.status} />}
      </div>

      <KalenderFixed
        gruppeId={gruppe.id}
        zeitraumVon={gruppe.zeitraum_von}
        zeitraumBis={gruppe.zeitraum_bis}
        abgeschlossen={gruppe.abgeschlossen || !gruppe.aktiv}
        gruppeName={gruppe.name}
        api={api}
        adminMode
      />
    </div>
  );
}
