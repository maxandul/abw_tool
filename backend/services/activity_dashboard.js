/* Shared calculation and UI for the live dashboard and its offline export. */
export const LABELS = {
  form: {
    EINZELARBEIT: "Allein arbeiten",
    ONLINE: "Online-Meeting / Telefonat",
    MEETING: "Zusammenarbeit vor Ort",
  },
  ao: {
    UEBLICHER_ARBEITSPLATZ: "Untersuchter Standort",
    HOMEOFFICE: "Homeoffice",
    ANDERER_VD_STANDORT: "Anderer VD-Standort",
    MOBIL_EXTERN: "Anderswo / unterwegs",
  },
  room: {
    ARBEITSPLATZ: "Büroarbeitsplatz",
    RUECKZUG: "Rückzugs- / Telefonraum",
    BESPRECHUNG: "Besprechungsraum",
    OFFEN: "Offener Gemeinschaftsbereich",
  },
  gg: {
    ALLEIN: "Nur ich",
    ZWEI_BIS_VIER: "2–4 Personen",
    FUENF_BIS_ACHT: "5–8 Personen",
    NEUN_BIS_ZWOELF: "9–12 Personen",
    DREIZEHN_PLUS: "13+ Personen",
  },
  tk: {
    STANDORTINTERN: "Nur standortinterne Personen",
    STANDORTUEBERGREIFEND_EXTERN: "Auch andere Standorte / Gäste",
  },
  hybrid: { true: "Mit Online-Zuschaltung", false: "Ohne Online-Zuschaltung" },
  absence: {
    TEILZEIT: "Arbeitsfrei wegen Teilzeit",
    SONSTIGES: "Andere Abwesenheit",
  },
};
export const FIELDS = {
  form: "Tätigkeit",
  ao: "Aufenthaltsort",
  room: "Genutzter Platz",
  gg: "Personen im selben Raum",
  tk: "Personenkreis im Raum",
  hybrid: "Hybrid",
};
export const DEFAULTS = {
  tab: "overview",
  location: "UEBLICHER_ARBEITSPLATZ",
  filters: {},
  split: "form",
  second: "",
  metric: "mean",
  windows: [
    [480, 720],
    [780, 1020],
  ],
  threshold: 85,
};
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr"];
const SIZE = {
  ZWEI_BIS_VIER: 3,
  FUENF_BIS_ACHT: 6.5,
  NEUN_BIS_ZWOELF: 10.5,
  DREIZEHN_PLUS: 13,
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const round = (n) => Math.round(n).toLocaleString("de-CH");
const clock = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const overlap = (e, a, b) =>
  Math.max(0, Math.min(e.bis, b) - Math.max(e.von, a));
const work = (e) => e.form !== "ABWESENHEIT";
const value = (e, f) => (e[f] == null ? "missing" : String(e[f]));
const label = (f, v) =>
  v === "missing"
    ? "Angabe fehlt"
    : v === "na"
      ? "Nicht anwendbar"
      : (LABELS[f]?.[v] ?? v);
const applicable = (e, f) =>
  f === "room"
    ? e.ao === "UEBLICHER_ARBEITSPLATZ"
    : ["tk", "hybrid"].includes(f)
      ? e.form === "MEETING"
      : true;
const fieldValue = (e, f) => (applicable(e, f) ? value(e, f) : "na");
const matches = (e, state, ignore = "") =>
  (!state.location || e.ao === state.location) &&
  Object.entries(state.filters || {}).every(
    ([f, vs]) =>
      f === ignore ||
      ["funktion", "oe", "grad"].includes(f) ||
      !vs?.length ||
      vs.includes(fieldValue(e, f)),
  );
const mean = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const keyOf = (e, split, second) =>
  JSON.stringify([
    fieldValue(e, split),
    ...(second ? [fieldValue(e, second)] : []),
  ]);
const keyLabel = (key, split, second) => {
  const [a, b] = JSON.parse(key);
  return label(split, a) + (second ? " · " + label(second, b) : "");
};
function unionMinutes(entries, a, b) {
  const spans = entries
    .map((e) => [Math.max(a, e.von), Math.min(b, e.bis)])
    .filter(([x, y]) => y > x)
    .sort((x, y) => x[0] - y[0]);
  let end = a,
    total = 0;
  for (const [x, y] of spans) {
    total += Math.max(0, y - Math.max(x, end));
    end = Math.max(end, y);
  }
  return total;
}
export function validateWindows(windows) {
  return (
    Array.isArray(windows) &&
    windows.length === 2 &&
    windows.every(
      (w) =>
        Array.isArray(w) &&
        w.length === 2 &&
        w.every(Number.isFinite) &&
        w[0] >= 420 &&
        w[1] <= 1140 &&
        w[1] - w[0] >= 60,
    ) &&
    windows[0][1] <= windows[1][0]
  );
}
export function calculateDashboard(data, settings = {}) {
  const state = { ...DEFAULTS, ...settings, filters: settings.filters || {} };
  if (!validateWindows(state.windows))
    throw Error(
      "Bitte zwei gültige, nicht überlappende Halbtagfenster zwischen 07:00 und 19:00 wählen (mindestens eine Stunde).",
    );
  const submitted = data.teilnehmer.filter((p) => p.eingereicht);
  const current = data.eintraege.filter((e) => e.v2);
  const active = new Set(current.map((e) => e.t));
  const people = submitted.filter(
    (p) =>
      active.has(p.i) &&
      ["funktion", "oe", "grad"].every(
        (f) =>
          !state.filters[f]?.length || state.filters[f].includes(String(p[f])),
      ),
  );
  const ids = new Set(people.map((p) => p.i));
  const all = current.filter((e) => ids.has(e.t));
  const byPersonDay = new Map(),
    currentByDay = new Map();
  for (const e of current) {
    if (!currentByDay.has(e.d)) currentByDay.set(e.d, []);
    currentByDay.get(e.d).push(e);
  }
  for (const e of all) {
    const k = `${e.t}|${e.d}`;
    if (!byPersonDay.has(k)) byPersonDay.set(k, []);
    byPersonDay.get(k).push(e);
  }
  const dates = new Set();
  for (const p of people)
    for (
      let day = new Date(p.start + "T00:00:00Z");
      day.toISOString().slice(0, 10) <= p.end;
      day.setUTCDate(day.getUTCDate() + 1)
    )
      if (day.getUTCDay() % 6 !== 0) dates.add(day.toISOString().slice(0, 10));
  const observations = [];
  for (const d of [...dates].sort()) {
    const expected = people.filter((p) => p.start <= d && p.end >= d);
    for (let h = 0; h < 2; h++) {
      const [a, b] = state.windows[h];
      const valid =
        expected.length > 0 &&
        expected.every(
          (p) =>
            unionMinutes(byPersonDay.get(`${p.i}|${d}`) || [], a, b) /
              (b - a) >=
            state.threshold / 100,
        );
      observations.push({
        d,
        h,
        wd: (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7,
        a,
        b,
        valid,
      });
    }
  }
  const valid = observations.filter((o) => o.valid);
  const eligible = new Set(valid.map((o) => `${o.d}|${o.h}`));
  const selected = all.filter((e) => work(e) && matches(e, state));
  const scope = all.filter(
    (e) => work(e) && (!state.location || e.ao === state.location),
  );
  const minuteTotal = (es) =>
    es.reduce(
      (total, e) =>
        total +
        valid
          .filter((o) => o.d === e.d)
          .reduce((s, o) => s + overlap(e, o.a, o.b), 0),
      0,
    );
  const denominator = minuteTotal(scope);
  const rowsFor = (split, second = "") => {
    const keys = [
      ...new Set(selected.map((e) => keyOf(e, split, second))),
    ].sort();
    return keys.map((key) => {
      const es = selected.filter((e) => keyOf(e, split, second) === key);
      const byDay = new Map();
      for (const e of es) {
        if (!byDay.has(e.d)) byDay.set(e.d, []);
        byDay.get(e.d).push(e);
      }
      const values = valid.map((o) => {
        const here = (byDay.get(o.d) || []).filter(
          (e) => overlap(e, o.a, o.b) > 0,
        );
        return {
          ...o,
          n: here.reduce((s, e) => s + overlap(e, o.a, o.b), 0) / (o.b - o.a),
          heads: new Set(here.map((e) => e.u)).size,
        };
      });
      const peak = values.reduce(
        (best, o) => (!best || o.n > best.n ? o : best),
        null,
      );
      return {
        key,
        name: keyLabel(key, split, second),
        minutes: minuteTotal(es),
        share: denominator ? (minuteTotal(es) / denominator) * 100 : 0,
        average: mean(values.map((o) => o.n)),
        morning: mean(values.filter((o) => o.h === 0).map((o) => o.n)),
        afternoon: mean(values.filter((o) => o.h === 1).map((o) => o.n)),
        peak,
        cells: Array.from({ length: 10 }, (_, i) => {
          const vs = values.filter(
            (o) => o.wd === Math.floor(i / 2) && o.h === i % 2,
          );
          const top = vs.reduce(
            (best, o) => (!best || o.n > best.n ? o : best),
            null,
          );
          return {
            mean: mean(vs.map((o) => o.n)),
            max: top?.n ?? null,
            date: top?.d,
            days: vs.length,
            heads: mean(vs.map((o) => o.heads)),
          };
        }),
      };
    });
  };
  // Estimate using the full submitted cohort BEFORE profile or activity filters.
  // Anonymous pooled reporters cannot identify actual meetings; these are equivalents.
  const meetingValues = valid.map((o) => {
    let integral = 0;
    for (let t = o.a; t < o.b; t += 15) {
      const end = Math.min(t + 15, o.b),
        buckets = new Map();
      for (const e of currentByDay.get(o.d) || []) {
        if (e.form !== "MEETING" || !e.onsite || e.von >= end || e.bis <= t)
          continue;
        const key = JSON.stringify([e.g, e.gg, e.tk, e.room, e.hybrid]);
        if (!buckets.has(key)) buckets.set(key, new Map());
        buckets.get(key).set(e.u, e);
      }
      for (const bucket of buckets.values()) {
        const reporters = [...bucket.values()],
          e = reporters[0];
        const chosen = reporters.filter(
          (x) => ids.has(x.t) && matches(x, state),
        );
        const internal = e.tk === "STANDORTINTERN";
        const n = internal
          ? Math.max(1, Math.round(reporters.length / (SIZE[e.gg] || 1)))
          : reporters.length;
        integral += n * (chosen.length / reporters.length) * (end - t);
      }
    }
    return { ...o, n: integral / (o.b - o.a) };
  });
  const outside = selected.reduce(
    (s, e) =>
      s +
      (e.bis - e.von) -
      state.windows.reduce((v, [a, b]) => v + overlap(e, a, b), 0),
    0,
  );
  const absences = Object.keys(LABELS.absence).map((reason) => ({
    name: LABELS.absence[reason],
    minutes: minuteTotal(all.filter((e) => e.absence === reason)),
  }));
  const options = {};
  for (const f of Object.keys(FIELDS)) {
    const es = all.filter((e) => work(e) && matches(e, state, f));
    options[f] = [
      ...new Set(es.filter((e) => applicable(e, f)).map((e) => value(e, f))),
    ].sort();
  }
  for (const f of ["funktion", "oe", "grad"])
    options[f] = [
      ...new Set(
        submitted.filter((p) => active.has(p.i)).map((p) => String(p[f])),
      ),
    ].sort();
  return {
    people: new Set(people.map((p) => p.u)).size,
    submitted: submitted.length,
    legacyEntries: data.eintraege.filter((e) => !e.v2).length,
    excludedPeople: submitted.filter((p) => !active.has(p.i)).length,
    valid: valid.length,
    expected: observations.length,
    excluded: observations.length - valid.length,
    denominator,
    outside,
    options,
    absences,
    rows: rowsFor(state.split, state.second),
    activities: rowsFor("form"),
    places: rowsFor("room"),
    meetings: {
      mean: mean(meetingValues.map((o) => o.n)),
      peak: meetingValues.reduce(
        (best, o) => (!best || o.n > best.n ? o : best),
        null,
      ),
      mixed: current.some(
        (e) => e.form === "MEETING" && e.tk === "STANDORTUEBERGREIFEND_EXTERN",
      ),
    },
    selectedMinutes: minuteTotal(selected),
    eligible,
  };
}

export function mountDashboard(root, data, initial = {}, onExport = null) {
  let state = {
    ...DEFAULTS,
    ...initial,
    filters: { ...(initial.filters || {}) },
  };
  let detail = "",
    currentView = "";
  const storageKey = "abw-dashboard-views-v2:" + data.gruppen_namen.join("|");
  let views = [];
  try {
    views = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(views)) views = [];
  } catch {
    views = [];
  }
  const select = (key, title, options, current) =>
    `<label>${esc(title)}<select data-setting="${key}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(current) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  const metric = (n) =>
    n == null ? "–" : n > 0 && n < 0.5 ? "&lt;1" : round(n);
  const bars = (rows) =>
    rows.some((r) => r.average != null)
      ? rows
          .map(
            (r) =>
              `<div class="ad-bar-row"><span>${esc(r.name)}</span><div class="ad-track"><div style="width:${Math.min(100, r.share)}%"></div></div><strong>${metric(r.share)} %</strong></div>`,
          )
          .join("")
      : "<p>Keine passenden Tätigkeiten in auswertbaren Halbtagen.</p>";
  function render() {
    const openPanels = [...root.querySelectorAll("details[open]")].map(
      (d, i) => d.dataset.panel || String(i),
    );
    const focused = document.activeElement;
    const focusKey = ["setting", "filter", "window"].find(
      (k) => focused?.dataset?.[k],
    );
    const focusValue = focusKey ? focused.dataset[focusKey] : null;
    let result;
    try {
      result = calculateDashboard(data, state);
    } catch (e) {
      root.innerHTML = `<div class="ad-notice" role="alert">${esc(e.message)} <button data-action="reset">Zeitfenster zurücksetzen</button></div>`;
      return;
    }
    const r = result;
    const splitOptions = Object.entries(FIELDS)
      .filter(([f]) => r.options[f]?.length)
      .map(([v, l]) => [v, l]);
    const filters = Object.entries({
      ...FIELDS,
      funktion: "Funktion",
      oe: "Organisationseinheit",
      grad: "Beschäftigungsgrad",
    })
      .filter(
        ([f]) =>
          r.options[f]?.length &&
          (r.options[f].length > 1 || state.filters[f]?.length),
      )
      .map(
        ([f, l]) =>
          `<label>${esc(l)}<select multiple size="${Math.min(4, r.options[f].length)}" data-filter="${f}" aria-label="${esc(l)}">${r.options[f].map((v) => `<option value="${esc(v)}" ${state.filters[f]?.includes(v) ? "selected" : ""}>${esc(LABELS[f] ? label(f, v) : v || "Nicht angegeben")}${f === "grad" ? " %" : ""}</option>`).join("")}</select></label>`,
      )
      .join("");
    const active = Object.entries(state.filters).flatMap(([f, vs]) =>
      (vs || []).map(
        (v) =>
          `${FIELDS[f] || { funktion: "Funktion", oe: "OE", grad: "Pensum" }[f]}: ${LABELS[f] ? label(f, v) : v}`,
      ),
    );
    const max = Math.max(
      1,
      ...r.rows.flatMap((row) =>
        row.cells.map((c) => c[state.metric === "peak" ? "max" : "mean"] || 0),
      ),
    );
    const matrix = `<div class="ad-scroll"><table><caption>${state.metric === "peak" ? "Stärkste beobachtete Halbtage" : "Typische Woche"} · zeitgewichtete Personen</caption><thead><tr><th scope="col">${esc(FIELDS[state.split])}</th>${DAYS.map((d) => `<th colspan="2" scope="colgroup">${d}</th>`).join("")}<th scope="col">Ø</th><th scope="col">Spitze</th></tr><tr><th></th>${DAYS.map(() => '<th scope="col">VM</th><th scope="col">NM</th>').join("")}<th></th><th></th></tr></thead><tbody>${r.rows
      .map(
        (row, ri) =>
          `<tr><th scope="row">${esc(row.name)}</th>${row.cells
            .map((c, i) => {
              const n = c[state.metric === "peak" ? "max" : "mean"];
              return `<td><button class="ad-cell" data-cell="${ri},${i}" style="--heat:${n == null ? 0 : 0.08 + (0.32 * n) / max}" aria-label="${esc(row.name)}, ${DAYS[Math.floor(i / 2)]} ${i % 2 ? "Nachmittag" : "Vormittag"}, ${n == null ? "keine Daten" : round(n) + " Personen"}">${metric(n)}</button></td>`;
            })
            .join(
              "",
            )}<td>${metric(row.average)}</td><td>${metric(row.peak?.n)}</td></tr>`,
      )
      .join("")}</tbody></table></div>`;
    root.innerHTML = `<div class="ad-shell">
      <header class="ad-heading"><div><p class="ad-eyebrow">TÄTIGKEITEN & ARBEITSUMGEBUNG</p><h2>${esc(data.gruppen_namen.join(" · "))}</h2><p>${esc(data.zeitraum_von)} bis ${esc(data.zeitraum_bis)}</p></div><div class="ad-actions">${onExport ? '<button data-action="export">Interaktiven Bericht exportieren</button>' : ""}<button data-action="csv">Tabelle als CSV</button><button data-action="print">Drucken / PDF</button></div></header>
      <div class="ad-toolbar">${select(
        "location",
        "Aufenthaltsort",
        [
          ["UEBLICHER_ARBEITSPLATZ", "Am untersuchten Standort"],
          ["", "Alle Arbeitsorte"],
          ["HOMEOFFICE", "Homeoffice"],
          ["ANDERER_VD_STANDORT", "Anderer VD-Standort"],
          ["MOBIL_EXTERN", "Anderswo / unterwegs"],
        ],
        state.location,
      )}<details data-panel="filters"><summary>Filter${active.length ? " (" + active.length + ")" : ""}</summary><p>Mehrere Werte mit Strg / Cmd auswählen. Innerhalb eines Merkmals gilt «oder», zwischen Merkmalen «und».</p><div class="ad-filter-grid">${filters}</div><button data-action="clear">Alle Merkmalsfilter zurücksetzen</button></details><details data-panel="basis"><summary>Zeitfenster & Datenbasis</summary><div class="ad-window-grid">${state.windows.map((w, h) => w.map((v, j) => `<label>${h ? "Nachmittag" : "Vormittag"} ${j ? "bis" : "von"}<input type="time" min="07:00" max="19:00" step="900" data-window="${h},${j}" value="${clock(v)}"></label>`).join("")).join("")}</div><p>Ø Personen = Tätigkeitsminuten geteilt durch die Länge des Halbtagfensters. Nur Halbtage mit mindestens 85 % dokumentierter Fensterzeit bei jeder eingereichten Person mit aktueller Erfassung fliessen ein. Dokumentierte Abwesenheiten zählen als null, fehlende Erfassungen nicht.</p><p>Ausserhalb der Fenster: ${round(r.outside / 60)} erfasste Tätigkeitsstunden. Diese sind in den Charts nicht enthalten. Unterschiedlich lange Fenster ergeben unterschiedlich gewichtete Personenwerte; das Tagesmittel mittelt die auswertbaren Halbtage.</p></details></div>
      <p class="ad-context">${esc(active.join(" · ") || "Alle Tätigkeiten und Personengruppen")} · Zeitanteile beziehen sich auf die gesamte Arbeitszeit im gewählten Aufenthaltsort und Personenkreis, vor Tätigkeitsfiltern.</p>
      <div class="ad-stats"><div><span>Ausgewertete Personen</span><strong>${r.people}</strong><small>${r.submitted} eingereichte Erhebungen</small></div><div><span>Auswertbare Halbtage</span><strong>${r.valid} / ${r.expected}</strong><small>${r.excluded} wegen Erfassungslücken ausgeschlossen</small></div><div><span>Arbeitszeit in der Auswahl</span><strong>${round(r.selectedMinutes / 60)} h</strong><small>innerhalb der gewählten Zeitfenster</small></div></div>
      ${r.legacyEntries ? `<p class="ad-notice">${r.legacyEntries} historische Einträge werden nicht in die neue Struktur umgedeutet. ${r.excludedPeople} Einreichungen ohne aktuelle Einträge sind hier ausgeschlossen. Historische Daten sind in der bisherigen Auswertung verfügbar.</p>` : ""}
      ${!r.valid ? '<p class="ad-notice" role="status">Keine ausreichend dokumentierten Halbtage. Bitte Zeitfenster und Erfassungsabdeckung prüfen. Fehlende Daten werden nicht als null dargestellt.</p>' : ""}
      <nav class="ad-tabs" aria-label="Auswertungsansichten">${[
        ["overview", "Überblick"],
        ["week", "Wochenprofil"],
        ["custom", "Eigene Kombinationen"],
      ]
        .map(
          ([v, l]) =>
            `<button data-tab="${v}" aria-pressed="${state.tab === v}">${l}</button>`,
        )
        .join("")}</nav>
      ${
        state.tab === "overview"
          ? `<div class="ad-two"><section><h3>Tätigkeitsmix</h3><p>Anteil der Arbeitszeit in der Auswahl</p>${bars(r.activities)}</section><section><h3>Tatsächlich genutzte Plätze</h3><p>Aktuelle Nutzung, keine Aussage über benötigte Räume</p>${bars(r.places)}</section></div><section><h3>Durchschnittlicher Tag</h3><div class="ad-scroll"><table><thead><tr><th scope="col">Tätigkeit</th><th scope="col">Ø Vormittag</th><th scope="col">Ø Nachmittag</th><th scope="col">Tagesmittel</th></tr></thead><tbody>${r.activities.map((row) => `<tr><th scope="row">${esc(row.name)}</th><td>${metric(row.morning)}</td><td>${metric(row.afternoon)}</td><td>${metric(row.average)}</td></tr>`).join("")}</tbody></table></div><p>Zeitgewichtete Personen, gerundet. Eine Person während der Hälfte eines Fensters zählt als 0,5; gerundete Summen können abweichen.</p></section><section><h3>Dokumentierte Abwesenheiten</h3><p>${r.absences.map((x) => `${esc(x.name)}: ${round(x.minutes / 60)} h`).join(" · ")}. Separat ausgewiesen, nicht im Tätigkeitsmix enthalten.</p></section>`
          : `<section><div class="ad-toolbar">${select("split", "Aufteilen nach", splitOptions, state.split)}${state.tab === "custom" ? select("second", "Zusätzlich unterscheiden nach", [["", "Keine zweite Aufteilung"], ...splitOptions.filter(([v]) => v !== state.split)], state.second) : ""}${select(
              "metric",
              "Wochenprofil",
              [
                ["mean", "Durchschnitt"],
                ["peak", "Beobachtete Spitzen"],
              ],
              state.metric,
            )}</div>${state.tab === "custom" ? `<div class="ad-save"><input aria-label="Name der Ansicht" placeholder="Name für diese Ansicht" maxlength="80" data-view-name><button data-action="save">Ansicht speichern</button>${views.length ? `<select aria-label="Gespeicherte Ansicht" data-view><option value="">Gespeicherte Ansicht öffnen</option>${views.map((v, i) => `<option value="${i}" ${String(i) === currentView ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select><button data-action="delete-view">Gespeicherte Ansicht löschen</button>` : ""}</div>` : ""}${r.rows.length ? matrix : "<p>Keine Treffer für diese Kombination. Filter zurücksetzen oder eine andere Kombination wählen.</p>"}<p class="ad-context" aria-live="polite">${esc(detail || "Zelle auswählen: Datenbasis, beteiligte Personen und Datum der Spitze ansehen.")}</p>${state.tab === "custom" ? `<h3>Zeitanteile der Kombinationen</h3>${bars(r.rows)}` : ""}</section>`
      }
      <section><h3>Grobe Annäherung an parallele Besprechungen am Standort</h3><div class="ad-estimate"><strong>Ø ${metric(r.meetings.mean)}</strong><span>Stärkster Halbtag: ${metric(r.meetings.peak?.n)}${r.meetings.peak ? " · " + esc(r.meetings.peak.d) + (r.meetings.peak.h ? " NM" : " VM") : ""}</span></div><details data-panel="method"><summary>Wie werden gemeinsame Besprechungen angenähert?</summary><p>Überlappende Meldungen derselben Erhebung, Gruppengrösse, Raumnutzung, Hybrid-Angabe und desselben Personenkreises werden je Zeitabschnitt gebündelt. Bei rein internen Gruppen teilen wir durch 3, 6,5, 10,5 bzw. 13 Personen und runden auf die nächste ganze Sitzung (mindestens eine). Vier Meldungen in der Klasse 2–4 ergeben so ungefähr eine gemeinsame Besprechung. Bei 13+ ist 13 eine Annahme.</p><p>Die Bündelung erfolgt vor Filtern; Teilgruppen erhalten einen anteiligen Wert. Bei Gästen fehlt deren Zahl: jede Meldung zählt vorsichtig als eine mögliche Sitzung und kann überschätzen. Verschiedene echte Sitzungen können zusammenfallen, unvollständige Meldungen unterschätzen. Die Halbtagwerte sind zeitgewichtete Sitzungsäquivalente, keine identifizierten Sitzungen und keine empfohlene Anzahl Räume.</p></details></section>
      <footer>Grobe Orientierung für die Raumgestaltung · Ganze Zahlen${r.meetings.mixed ? " · Gemischte Besprechungen mit Gästen vorhanden" : ""}. ${onExport ? "Der interaktive Export enthält die pseudonymisierten Daten der gesamten ausgewählten Erhebung; Filter können darin geändert werden." : ""}</footer>
    </div>`;
    for (const d of root.querySelectorAll("details"))
      if (openPanels.includes(d.dataset.panel)) d.open = true;
    if (focusKey) {
      const control = root.querySelector(`[data-${focusKey}="${focusValue}"]`);
      control?.focus({ preventScroll: true });
    }
  }
  const download = (content, type, name) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  function change(event) {
    const el = event.target;
    if (el.dataset.setting) {
      state[el.dataset.setting] = el.value;
      if (el.dataset.setting === "split" && state.second === state.split)
        state.second = "";
      if (el.dataset.setting === "location") state.filters = {};
      detail = "";
      render();
    }
    if (el.dataset.filter) {
      state.filters[el.dataset.filter] = [...el.selectedOptions].map(
        (o) => o.value,
      );
      detail = "";
      render();
    }
    if (el.dataset.window) {
      const [h, j] = el.dataset.window.split(",").map(Number);
      const [hh, mm] = el.value.split(":").map(Number);
      const windows = state.windows.map((w) => [...w]);
      windows[h][j] = hh * 60 + mm;
      if (validateWindows(windows)) {
        state.windows = windows;
        detail = "";
        render();
      } else {
        el.value = clock(state.windows[h][j]);
        el.setCustomValidity(
          "Gültige, nicht überlappende Fenster von mindestens einer Stunde wählen.",
        );
        el.reportValidity();
      }
    }
    if (el.hasAttribute("data-view") && el.value !== "") {
      currentView = el.value;
      state = { ...DEFAULTS, ...views[Number(el.value)].state };
      detail = "";
      render();
    }
  }
  function click(event) {
    const el = event.target.closest("button");
    if (!el) return;
    if (el.dataset.tab) {
      state.tab = el.dataset.tab;
      if (state.tab !== "custom") state.second = "";
      detail = "";
      render();
    }
    if (el.dataset.cell) {
      const [ri, i] = el.dataset.cell.split(",").map(Number);
      const row = calculateDashboard(data, state).rows[ri],
        c = row.cells[i];
      detail = `${row.name} · ${DAYS[Math.floor(i / 2)]} ${i % 2 ? "NM" : "VM"}: ${c.days} auswertbare Halbtage; Ø ${round(c.heads || 0)} unterschiedliche beteiligte Personen (über Tätigkeiten nicht addierbar).${c.date ? " Höchster Halbtag: " + c.date + "." : ""}`;
      render();
    }
    const action = el.dataset.action;
    if (action === "clear") {
      state.filters = {};
      detail = "";
      render();
    }
    if (action === "reset") {
      state.windows = DEFAULTS.windows;
      render();
    }
    if (action === "print") window.print();
    if (action === "export" && onExport) onExport(state);
    if (action === "save") {
      const name = root.querySelector("[data-view-name]").value.trim();
      if (!name) return;
      views = views.filter((v) => v.name !== name);
      views.push({ name, state: JSON.parse(JSON.stringify(state)) });
      currentView = String(views.length - 1);
      try {
        localStorage.setItem(storageKey, JSON.stringify(views));
      } catch {
        detail =
          "Ansicht nur für diese Sitzung gespeichert; lokaler Speicher ist nicht verfügbar.";
      }
      render();
    }
    if (action === "delete-view") {
      const select = root.querySelector("[data-view]");
      if (select?.value === "") return;
      views.splice(Number(select.value), 1);
      currentView = "";
      try {
        localStorage.setItem(storageKey, JSON.stringify(views));
      } catch {
        /* current session only */
      }
      render();
    }
    if (action === "csv") {
      const r = calculateDashboard(data, state);
      const quote = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+@\-\t\r]/, "'$&")
          .replace(/"/g, '""') +
        '"';
      const lines = [
        ["Auswertung", data.gruppen_namen.join(" / ")],
        ["Zeitraum", data.zeitraum_von, data.zeitraum_bis],
        ["Aufenthaltsort", state.location || "Alle"],
        ["Filter", JSON.stringify(state.filters)],
        [
          "Wochenwerte",
          state.metric === "peak" ? "Beobachtete Spitzen" : "Durchschnitt",
        ],
        [
          "Fenster",
          state.windows.map((w) => w.map(clock).join("–")).join(" / "),
        ],
        ["Auswertbare Halbtage", r.valid],
        [
          "Kombination",
          "Zeitanteil %",
          "Ø Personen",
          ...DAYS.flatMap((d) => [d + " VM", d + " NM"]),
        ],
        ...r.rows.map((row) => [
          row.name,
          Math.round(row.share),
          row.average == null ? "" : Math.round(row.average),
          ...row.cells.map((c) =>
            c[state.metric === "peak" ? "max" : "mean"] == null
              ? ""
              : Math.round(c[state.metric === "peak" ? "max" : "mean"]),
          ),
        ]),
      ];
      download(
        "\uFEFF" + lines.map((l) => l.map(quote).join(";")).join("\r\n"),
        "text/csv;charset=utf-8",
        "taetigkeiten-auswertung.csv",
      );
    }
  }
  root.addEventListener("change", change);
  root.addEventListener("click", click);
  render();
  return () => {
    root.removeEventListener("change", change);
    root.removeEventListener("click", click);
    root.replaceChildren();
  };
}
