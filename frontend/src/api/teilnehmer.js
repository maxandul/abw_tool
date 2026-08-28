import { del, get, post, put } from "./client";

export const getKategorien  = (gId)   =>
  get(gId ? `/api/kategorien?gruppe_id=${gId}` : "/api/kategorien");
export const getMeineGruppen = ()     => get("/api/meine-gruppen");
export const getDashboard   = (gId)   => get(`/api/dashboard?gruppe_id=${gId}`);

export const getEintraege   = (gId, von, bis) =>
  get(`/api/eintraege?gruppe_id=${gId}&datum_von=${von}&datum_bis=${bis}`);
export const createEintrag  = (body)  => post("/api/eintraege", body);
export const updateEintrag  = (id, b) => put(`/api/eintraege/${id}`, b);
export const deleteEintrag  = (id)    => del(`/api/eintraege/${id}`);

export const getEinreichung  = (gId)   => get(`/api/einreichung?gruppe_id=${gId}`);
export const getLuecken      = (gId)   => get(`/api/einreichung/luecken?gruppe_id=${gId}`);
export const einreichen      = (gId)   => post("/api/einreichung/einreichen",  { gruppe_id: gId });
export const entsperren      = (gId)   => post("/api/einreichung/entsperren",  { gruppe_id: gId });
