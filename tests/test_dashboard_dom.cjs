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
const text = () => get("#dashboard").textContent;
// Walk from the overview peak to all observations for that weekday.
assert.ok(!get("[data-preset]").closest("details"));
click('[data-action="peak-days"]');
assert.equal(w.current.tab, "week");
const dates = () =>
  [...get(".ad-detail").querySelectorAll("tbody tr")].map((row) =>
    [...row.cells].map((cell) => cell.textContent),
  );
assert.deepEqual(dates(), [
  ["05.10.2026", "8", "100 %"],
  ["12.10.2026", "8", "100 %"],
]);
click('[data-action="close-detail"]');
assert.equal(doc.activeElement.id, "ad-total-1");
click('[data-cell="total,4"]');
assert.deepEqual(dates(), [["07.10.2026", "Keine Angaben", "0 %"]]);
click('[data-tab="cross"]');
assert.equal(doc.querySelector('[data-setting="shareBase"]'), null);
const crossRow = (name) =>
  [
    ...get('[data-setting="crossBy"]')
      .closest("section")
      .querySelectorAll("tbody tr"),
  ].find((row) => row.cells[0].textContent === name);
assert.match(
  crossRow("Online-Meeting / Telefonat").cells[1].textContent,
  /36 h100 %/,
);
select('[data-setting="crossBy"]', "room");
assert.match(crossRow("Büroarbeitsplatz").textContent, /36 h43 %/);
click('[data-tab="custom"]');
select('[data-setting="split"]', "form");
select('[data-setting="second"]', "oe");
const teamwork = [...doc.querySelectorAll(".ad-stack-row")].find((row) =>
  row.textContent.startsWith("Zusammenarbeit vor Ort"),
);
assert.match(
  teamwork.querySelector("small").textContent,
  /96 h.*50 %.*8 berücksichtigte Personen/,
);
select('[data-setting="second"]', "");
click('[data-tab="overview"]');
select('[data-setting="location"]', "HOMEOFFICE");
assert.doesNotMatch(
  text(),
  /An diesen Plätzen wird gearbeitet|Geschätzte Zahl gleichzeitig laufender Besprechungen am Standort/,
);
select('[data-setting="location"]', "UEBLICHER_ARBEITSPLATZ");

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
click('[data-action="show-comparison"]');
assert.equal(doc.activeElement.id, "ad-comparison");
const comparisonHead = get("#ad-comparison thead").textContent;
assert.match(comparisonHead, /Organisationseinheit: IT/);
assert.match(comparisonHead, /Organisationseinheit: HR/);
assert.match(comparisonHead, /Differenz in Prozentpunkten/);
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
assert.equal(get('[data-setting="crossBy"]').value, "room");
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
assert.match(
  offline.window.document.getElementById("dashboard").textContent,
  /Festgehaltene Auswahl/,
);
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
const trendCsv = downloaded;
select('[data-setting="mode"]', "all");
click('[data-tab="cross"]');
select('[data-setting="crossBy"]', "room");
click('[data-action="csv"]');
const placeCsv = downloaded;

function readCsv(blob) {
  return new Promise((resolve, reject) => {
    const reader = new w.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
Promise.all([readCsv(trendCsv), readCsv(placeCsv)])
  .then(([trend, places]) => {
    assert.match(trend, /Personen im Mittel/);
    assert.match(trend, /Mindestvollständigkeit/);
    assert.match(trend, /Vergleichsauswahl/);
    assert.match(trend, /Differenz in Prozentpunkten/);
    assert.match(trend, /Gemeinsam ausgewertete Halbtage/);
    assert.match(places, /Anteil innerhalb Platz %/);
    assert.match(
      places,
      /"Büroarbeitsplatz";"Online-Meeting \/ Telefonat";"36";"43"/,
    );
    assert.deepEqual(errors, []);
    console.log(
      "DOM-Prüfungen bestanden: Fragestellungen, Wochenprofil, Einzelhalbtage, Filter, Vergleiche, Gruppenangaben, beide Leserichtungen, gespeicherte Ansichten, CSV, Tastaturfokus und Offlinebericht.",
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    dom.window.close();
    offline.window.close();
  });

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

// The same number of observations on different calendar dates is not a common basis.
const differentDates = structuredClone(data);
differentDates.eintraege = differentDates.eintraege.filter(
  (e) =>
    (e.t < 4 && e.d === "2026-10-05") || (e.t >= 4 && e.d === "2026-10-12"),
);
const paired = new JSDOM("<main></main>", {
  runScripts: "outside-only",
  url: "http://paired.test",
});
paired.window.eval(source + ";window.mount = mountDashboard;");
paired.window.mount(
  paired.window.document.querySelector("main"),
  differentDates,
  {
    tab: "week",
    filters: { oe: ["IT"] },
    comparison: { location: "UEBLICHER_ARBEITSPLATZ", filters: { oe: ["HR"] } },
  },
);
const result = paired.window.document.querySelector("#ad-comparison");
assert.match(result.textContent, /unterschiedlichen Halbtagen/);
assert.match(result.textContent, /Gemeinsam ausgewertete Halbtage: 0/);
assert.equal(result.querySelectorAll("tbody tr").length, 3);
paired.window.close();
