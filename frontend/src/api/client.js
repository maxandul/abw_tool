/**
 * Base fetch wrapper. Every API call returns { data, error }.
 * On network errors a generic error string is returned.
 */
async function request(method, url, body) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!text) {
      return { data: null, error: res.ok ? null : `Serverfehler (${res.status})` };
    }
    try {
      return JSON.parse(text);
    } catch {
      return {
        data: null,
        error: res.ok
          ? "Ungültige Serverantwort."
          : `Serverfehler (${res.status}) – bitte Backend neu starten.`,
      };
    }
  } catch {
    return { data: null, error: "Netzwerkfehler – ist das Backend auf Port 5000 erreichbar?" };
  }
}

export const get  = (url)        => request("GET",    url);
export const post = (url, body)  => request("POST",   url, body);
export const put  = (url, body)  => request("PUT",    url, body);
export const del  = (url)        => request("DELETE", url);
