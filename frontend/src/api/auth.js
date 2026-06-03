import { get, post } from "./client";

export const setupStatus  = ()      => get("/api/auth/setup-status");
export const setup        = (body)  => post("/api/auth/setup",        body);
export const login        = (body)  => post("/api/auth/login",        body);
export const logout       = ()      => post("/api/auth/logout");
export const me           = ()      => get("/api/auth/me");
export const pinAendern   = (body)  => post("/api/auth/pin-aendern",  body);
export const registrierenInfo = (token) => get(`/api/registrierung/${token}`);
export const registrieren = (body)  => post("/api/auth/registrieren", body);
