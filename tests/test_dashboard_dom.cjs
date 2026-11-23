/* Optional DOM interaction tests: NODE_PATH must contain jsdom. See docs/auswertung-dashboard.md. */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs
  .readFileSync(
    path.join(root, "backend/services/activity_dashboard.js"),
    "utf8",
  )
  .replace(/^export /gm, "");
const css = fs.readFileSync(
  path.join(root, "backend/services/activity_dashboard.css"),
  "utf8",
);
const people = Array.from({ length: 8 }, (_, i) => ({
  i,
  u: i,
  g: 1,
  start: "2026-10-05",
  end: "2026-10-12",
  eingereicht: i !== 7,
  oe: i < 4 ? "HR" : "IT",
  funktion: i % 2 ? "Fach" : "Leitung",
  grad: i < 3 ? 60 : i < 6 ? 80 : 100,
}));
const entries = [];
for (const d of ["2026-10-05", "2026-10-06", "2026-10-12"])
  for (const p of people) {
    for (const [von, bis, form, ao, room] of [
      [
        480,
        720,
        p.i % 2 ? "ONLINE" : "EINZELARBEIT",
        p.i === 7 ? "HOMEOFFICE" : "UEBLICHER_ARBEITSPLATZ",
        p.i === 7 ? null : "ARBEITSPLATZ",
      ],
      [780, 1020, "MEETING", "UEBLICHER_ARBEITSPLATZ", "BESPRECHUNG"],
    ])
      entries.push({
        t: p.i,
        u: p.i,
        g: 1,
        d,
        von,
        bis,
        v2: true,
        form,
        ao,
        onsite: ao === "UEBLICHER_ARBEITSPLATZ",
        room,
        gg: form === "MEETING" ? "ZWEI_BIS_VIER" : "ALLEIN",
        tk: form === "MEETING" ? "STANDORTINTERN" : null,
        hybrid: form === "MEETING" ? false : null,
      });
  }
const data = {
  teilnehmer: people,
  eintraege: entries,
  gruppen_namen: ["Browserprüfung"],
  zeitraum_von: "2026-10-05",
  zeitraum_bis: "2026-10-12",
  snapshot_date: "2026-10-20",
  snapshot_minute: 1200,
  snapshot_at: "2026-10-20T20:00:00+02:00",
  includes_drafts: true,
  default_mode: "all",
};
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#f8fafc}${css}</style><main id="dashboard"></main><script>${source}\nwindow.fixture=${JSON.stringify(data)};mountDashboard(document.getElementById('dashboard'),fixture,{},s=>window.exported=reportDataset(fixture,s),s=>window.current=s);</script></html>`;
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => errors.push(e.message));
const dom = new JSDOM(html, {
  url: "http://dashboard.test",
  runScripts: "dangerously",
  virtualConsole,
  beforeParse(w) {
    w.HTMLElement.prototype.scrollIntoView = () => {};
  },
});
const w = dom.window,
  doc = w.document;
const get = (s) => {
  const el = doc.querySelector(s);
  assert.ok(el, `Missing element: ${s}`);
  return el;
};
const click = (s) => get(s).click();
const select = (s, v) => {
  const el = get(s);
  el.value = v;
  assert.equal(el.value, v, `Missing option: ${v}`);
  el.dispatchEvent(new w.Event("change", { bubbles: true }));
};
const check = (s, v = true) => {
  const el = get(s);
  assert.ok(!el.disabled);
  el.checked = v;
  el.dispatchEvent(new w.Event("change", { bubbles: true }));
};
const text = () => doc.body.textContent;
click('[data-toggle="filters"]');
check('[data-filter="oe"][value="HR"]');
select('[data-setting="location"]', "HOMEOFFICE");
assert.equal(w.current.filters.oe.join(","), "HR");
assert.match(text(), /Keine passenden Tätigkeiten/);
select('[data-setting="location"]', "UEBLICHER_ARBEITSPLATZ");
click('[data-action="pin"]');
check('[data-filter="oe"][value="HR"]', false);
check('[data-filter="oe"][value="IT"]');
assert.equal(w.current.comparison.filters.oe.join(","), "HR");
assert.match(text(), /Festgehaltene Auswahl/);
select('[data-setting="shareBase"]', "selection");
click('[data-tab="custom"]');
select('[data-setting="split"]', "oe");
select('[data-setting="second"]', "form");
assert.match(text(), /Verteilung innerhalb der Gruppen/);
click("[data-cell]");
assert.match(
  get(".ad-detail").textContent,
  /unterschiedliche beteiligte Personen/,
);
get("[data-view-name]").value = "IT im Vergleich";
click('[data-action="save"]');
select("[data-preset]", "0");
assert.equal(w.current.tab, "cross");
assert.match(text(), /Welche Tätigkeiten finden an welchen Plätzen statt/);
select("[data-view]", "0");
assert.equal(w.current.split, "oe");
assert.equal(w.current.filters.oe.join(","), "IT");
click('[data-tab="trend"]');
assert.equal(doc.querySelectorAll(".ad-observation").length, 12);
// Capture the real CSV Blob; no network or browser download is needed.
let downloaded;
w.URL.createObjectURL = (blob) => {
  downloaded = blob;
  return "blob:test";
};
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = () => {};
click('[data-action="csv"]');
assert.ok(downloaded);
select('[data-setting="minCoverage"]', "85");
assert.equal(w.current.minCoverage, "85");
click('[data-tab="week"]');
select('[data-setting="metric"]', "peak");
select('[data-setting="mode"]', "submitted");
click('[data-action="export"]');
assert.equal(w.exported.teilnehmer.length, 7);
assert.equal(w.exported.includes_drafts, false);
// Remount exactly as a standalone offline report: same source, restricted data, saved state.
const offlineSource = `${source}\nmountDashboard(document.getElementById('dashboard'),${JSON.stringify(w.exported)},${JSON.stringify(w.current)},null,s=>window.current=s);`;
const offline = new JSDOM(
  `<main id="dashboard"></main><script>${offlineSource}</script>`,
  { runScripts: "dangerously", url: "http://offline.test", virtualConsole },
);
assert.equal(
  offline.window.document.querySelector('[data-setting="mode"]'),
  null,
);
assert.match(offline.window.document.body.textContent, /Festgehaltene Auswahl/);
const offlineLocation = offline.window.document.querySelector(
  '[data-setting="location"]',
);
offlineLocation.value = "";
offlineLocation.dispatchEvent(
  new offline.window.Event("change", { bubbles: true }),
);
assert.equal(offline.window.current.filters.oe.join(","), "IT");
// Conflicting filters remain visible and removable instead of silently disappearing.
select('[data-setting="location"]', "UEBLICHER_ARBEITSPLATZ");
check('[data-filter="room"][value="ARBEITSPLATZ"]');
select('[data-setting="location"]', "HOMEOFFICE");
assert.ok(get('[data-filter="room"][value="ARBEITSPLATZ"]').checked);
assert.match(
  text(),
  /Genutzte Plätze werden nur am untersuchten Standort erfasst/,
);
click('[data-clear="room"]');
assert.equal(w.current.filters.room, undefined);
click('[data-remove="oe"]');
assert.equal(w.current.filters.oe.length, 0);
// Keyboard focus survives complete rerendering.
get('[data-setting="location"]').focus();
select('[data-setting="location"]', "UEBLICHER_ARBEITSPLATZ");
assert.equal(doc.activeElement.id, "ad-setting-location");
const reader = new w.FileReader();
reader.onload = () => {
  assert.match(reader.result, /Personen im Mittel/);
  assert.match(reader.result, /Mindestvollständigkeit/);
  assert.match(reader.result, /Vergleichsauswahl/);
  assert.deepEqual(errors, []);
  console.log(
    "DOM-Prüfungen bestanden: Checkboxfilter, Erhalt der Auswahl, Vergleich, Prozentbasis, Aufteilungen, Details, gespeicherte Ansichten, Verlauf, CSV, Tastaturfokus und Offlinebericht.",
  );
  dom.window.close();
  offline.window.close();
};
reader.onerror = () => {
  throw reader.error;
};
reader.readAsText(downloaded);

// Long option lists: search, selection of all visible values, and safe rendering.
const manyData = structuredClone(data);
manyData.teilnehmer.forEach((p, i) => {
  p.oe = "OE " + i;
  p.funktion = "<img src=x onerror=alert(1)>";
});
const many = new JSDOM(
  `<main id="dashboard"></main><script>${source}\nmountDashboard(document.getElementById('dashboard'),${JSON.stringify(manyData)},{},null,s=>window.current=s);</script>`,
  {
    runScripts: "dangerously",
    url: "http://many-options.test",
    virtualConsole,
  },
);
many.window.document.querySelector('[data-toggle="filters"]').click();
const search = many.window.document.querySelector('[data-search="oe"]');
assert.ok(search);
search.focus();
search.value = "OE 1";
search.dispatchEvent(new many.window.Event("input", { bubbles: true }));
assert.equal(many.window.document.activeElement.id, "ad-search-oe");
many.window.document.querySelector('[data-all="oe"]').click();
assert.equal(many.window.current.filters.oe.join(","), "OE 1");
assert.equal(many.window.document.querySelectorAll("img").length, 0);
assert.ok(
  many.window.document.body.textContent.includes(
    "<img src=x onerror=alert(1)>",
  ),
);
many.window.close();
