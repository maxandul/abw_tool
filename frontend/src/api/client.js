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
    const json = await res.json();
    return json; // { data: ..., error: ... }
  } catch {
    return { data: null, error: "Netzwerkfehler – bitte erneut versuchen." };
  }
}

export const get  = (url)        => request("GET",    url);
export const post = (url, body)  => request("POST",   url, body);
export const put  = (url, body)  => request("PUT",    url, body);
export const del  = (url)        => request("DELETE", url);
