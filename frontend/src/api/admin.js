import { del, get, post, put } from "./client";

// Dashboard
export const getDashboard = () => get("/api/admin/dashboard");

// Gruppen
export const getGruppen         = (inclInaktiv = false) =>
  get(`/api/admin/gruppen${inclInaktiv ? "?include_inaktiv=1" : ""}`);
export const getGruppe          = (id)    => get(`/api/admin/gruppen/${id}`);
export const createGruppe       = (body)  => post("/api/admin/gruppen", body);
export const updateGruppe       = (id, b) => put(`/api/admin/gruppen/${id}`, b);
export const deleteGruppe       = (id)    => del(`/api/admin/gruppen/${id}`);
export const regenerateToken    = (id)    => post(`/api/admin/gruppen/${id}/neuer-token`);

// Teilnehmer
export const getTeilnehmer      = (gId)           => get(`/api/admin/gruppen/${gId}/teilnehmer`);
export const addTeilnehmer      = (gId, body)     => post(`/api/admin/gruppen/${gId}/teilnehmer`, body);
export const removeTeilnehmer   = (gId, uId)      => del(`/api/admin/gruppen/${gId}/teilnehmer/${uId}`);
export const resetPin           = (uId)           => post(`/api/admin/teilnehmer/${uId}/pin-reset`);
export const setEinreichungStatus = (uId, gId, b) =>
  put(`/api/admin/teilnehmer/${uId}/einreichung/${gId}`, b);

// Kategorien
export const getKategorien      = ()           => get("/api/admin/kategorien");
export const createKategorie    = (body)       => post("/api/admin/kategorien", body);
export const updateKategorie    = (id, b, m)   =>
  put(`/api/admin/kategorien/${id}?modus=${m ?? "ueberschreiben"}`, b);
export const deleteKategorie    = (id)         => del(`/api/admin/kategorien/${id}`);

// Raumtypen
export const getRaumtypen       = ()       => get("/api/admin/raumtypen");
export const createRaumtyp      = (body)   => post("/api/admin/raumtypen", body);
export const updateRaumtyp      = (id, b)  => put(`/api/admin/raumtypen/${id}`, b);
export const deleteRaumtyp      = (id)     => del(`/api/admin/raumtypen/${id}`);

// Auswertung
export const getLastprofil  = (p) => get(`/api/auswertung/lastprofil?${p}`);
export const getRaumbedarf  = (p) => get(`/api/auswertung/raumbedarf?${p}`);
export const getAnteile     = (p) => get(`/api/auswertung/anteile?${p}`);
export const getKennzahlen  = (p) => get(`/api/auswertung/kennzahlen?${p}`);
export const getExportUrl   = (p) => `/api/auswertung/export?${p}`;
