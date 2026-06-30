import { del, get, post, put } from "./client";

// Dashboard
export const getDashboard = () => get("/api/admin/dashboard");
export const getServerUrl  = () => get("/api/admin/server-url");

// Gruppen
export const getGruppen         = (inclInaktiv = false) =>
  get(`/api/admin/gruppen${inclInaktiv ? "?include_inaktiv=1" : ""}`);
export const getGruppe          = (id)    => get(`/api/admin/gruppen/${id}`);
export const createGruppe       = (body)  => post("/api/admin/gruppen", body);
export const updateGruppe       = (id, b) => put(`/api/admin/gruppen/${id}`, b);
export const deleteGruppe       = (id)    => del(`/api/admin/gruppen/${id}`);
export const abschliessenGruppe = (id)    => post(`/api/admin/gruppen/${id}/abschliessen`, {});
export const wiederoeffnenGruppe= (id)    => post(`/api/admin/gruppen/${id}/wiederoeffnen`, {});

// Teilnehmer
export const getTeilnehmer      = (gId)           => get(`/api/admin/gruppen/${gId}/teilnehmer`);
export const addTeilnehmer      = (gId, body)     => post(`/api/admin/gruppen/${gId}/teilnehmer`, body);
export const updateTeilnehmer   = (gId, uId, b)   => put(`/api/admin/gruppen/${gId}/teilnehmer/${uId}`, b);
export const importTeilnehmer   = (gId, rows)     =>
  post(`/api/admin/gruppen/${gId}/teilnehmer/import`, { rows });
export const removeTeilnehmer   = (gId, uId)      => del(`/api/admin/gruppen/${gId}/teilnehmer/${uId}`);
export const resetPin           = (uId)           => post(`/api/admin/teilnehmer/${uId}/pin-reset`);
export const setEinreichungStatus = (uId, gId, b) =>
  put(`/api/admin/teilnehmer/${uId}/einreichung/${gId}`, b);

// Teilnehmer-Einträge (Admin-Einsicht / -Bearbeitung)
export const getTnEintraegeKontext = (gId, uId) =>
  get(`/api/admin/gruppen/${gId}/teilnehmer/${uId}/kontext`);
export const getTnEintraege     = (gId, uId, von, bis) =>
  get(`/api/admin/gruppen/${gId}/teilnehmer/${uId}/eintraege?datum_von=${von}&datum_bis=${bis}`);
export const createTnEintrag    = (gId, uId, body) =>
  post(`/api/admin/gruppen/${gId}/teilnehmer/${uId}/eintraege`, body);
export const updateTnEintrag    = (gId, uId, eId, body) =>
  put(`/api/admin/gruppen/${gId}/teilnehmer/${uId}/eintraege/${eId}`, body);
export const deleteTnEintrag    = (gId, uId, eId) =>
  del(`/api/admin/gruppen/${gId}/teilnehmer/${uId}/eintraege/${eId}`);

// Kategorien
export const getKategorien      = ()           => get("/api/admin/kategorien");
export const createKategorie    = (body)       => post("/api/admin/kategorien", body);
export const updateKategorie    = (id, b, m)   =>
  put(`/api/admin/kategorien/${id}?modus=${m ?? "ueberschreiben"}`, b);
export const deleteKategorie    = (id)         => del(`/api/admin/kategorien/${id}`);
export const reactivateKategorie = (id)        => post(`/api/admin/kategorien/${id}/reaktivieren`, {});

// Raumtypen
export const getRaumtypen       = ()       => get("/api/admin/raumtypen");
export const createRaumtyp      = (body)   => post("/api/admin/raumtypen", body);
export const updateRaumtyp      = (id, b)  => put(`/api/admin/raumtypen/${id}`, b);
export const deleteRaumtyp      = (id)     => del(`/api/admin/raumtypen/${id}`);
export const reactivateRaumtyp  = (id)     => post(`/api/admin/raumtypen/${id}/reaktivieren`, {});

// Admin-Verwaltung
export const getAdmins       = ()       => get("/api/admin/admins");
export const createAdmin     = (body)   => post("/api/admin/admins", body);
export const resetAdminPin   = (id)     => post(`/api/admin/admins/${id}/pin-reset`, {});
export const deleteAdmin     = (id)     => del(`/api/admin/admins/${id}`);

// Auswertung
export const getTeilnehmerFilter = (p) => get(`/api/auswertung/teilnehmer-filter?${p}`);
export const getSample      = (p) => get(`/api/auswertung/sample?${p}`);
export const getLastprofil  = (p) => get(`/api/auswertung/lastprofil?${p}`);
export const getRaumbedarf  = (p) => get(`/api/auswertung/raumbedarf?${p}`);
export const getAnteile     = (p) => get(`/api/auswertung/anteile?${p}`);
export const getKennzahlen  = (p) => get(`/api/auswertung/kennzahlen?${p}`);
export const getExportUrl   = (p) => `/api/auswertung/export?${p}`;
