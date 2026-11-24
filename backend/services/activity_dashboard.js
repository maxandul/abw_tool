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
  ao: "Arbeitsort",
  room: "Genutzter Platz am Standort",
  gg: "Gruppengrösse im Raum (inkl. eigener Person)",
  tk: "Personenkreis im Raum",
  hybrid: "Online-Zuschaltung",
};
export const PROFILES = {
  funktion: "Funktion",
  oe: "Organisationseinheit",
  grad: "Beschäftigungsgrad",
  gradBand: "Beschäftigungsgrad (Bereiche)",
};
const gradBand = (n) =>
  n <= 60 ? "Bis 60 %" : n <= 80 ? "Über 60 bis 80 %" : "Über 80 %";
const allFields = { ...FIELDS, ...PROFILES };
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
  mode: "submitted",
  includeOngoing: false,
  shareBase: "scope",
  crossBy: "form",
  minCoverage: 0,
  comparison: null,
};
const TABS = [
  ["overview", "Überblick"],
  ["week", "Wochenprofil"],
  ["custom", "Details erkunden"],
  ["cross", "Tätigkeiten und Plätze"],
  ["trend", "Wochen und einzelne Halbtage"],
];
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
const percent = (n) => (n == null ? "–" : round(n) + " %");
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
      Object.hasOwn(PROFILES, f) ||
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
  return (
    displayValue(split, a) + (second ? " · " + displayValue(second, b) : "")
  );
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
  const state = {
    ...DEFAULTS,
    mode: data.default_mode || DEFAULTS.mode,
    ...settings,
    filters: settings.filters || {},
  };
  if (!validateWindows(state.windows))
    throw Error(
      "Bitte zwei gültige, nicht überlappende Halbtagfenster zwischen 07:00 und 19:00 wählen (mindestens eine Stunde).",
    );
  const mode =
    state.mode === "all" && data.includes_drafts !== false
      ? "all"
      : "submitted";
  const cohort = data.teilnehmer
    .filter((p) => mode === "all" || p.eingereicht)
    .map((p) => ({
      ...p,
      grad: p.grad ?? 100,
      funktion: p.funktion || "",
      oe: p.oe || "",
    }));
  const cohortIds = new Set(cohort.map((p) => p.i));
  const current = data.eintraege.filter((e) => e.v2 && cohortIds.has(e.t));
  const active = new Set(current.map((e) => e.t));
  const legacy = new Set(
    data.eintraege.filter((e) => !e.v2 && cohortIds.has(e.t)).map((e) => e.t),
  );
  const profileMatches = (p, ignore = "") =>
    Object.keys(PROFILES).every(
      (f) =>
        f === ignore ||
        !state.filters[f]?.length ||
        state.filters[f].includes(
          String(f === "gradBand" ? gradBand(p.grad ?? 100) : (p[f] ?? "")),
        ),
    );
  // No entries is unknown, not an exclusion. Purely historical captures stay separate.
  const compatible = cohort.filter((p) => !legacy.has(p.i) || active.has(p.i));
  const people = compatible.filter(profileMatches);
  const ids = new Set(people.map((p) => p.i));
  const profiles = new Map(people.map((p) => [p.i, p]));
  const all = current
    .filter((e) => ids.has(e.t))
    .map((e) => {
      const p = profiles.get(e.t);
      return {
        ...e,
        funktion: p.funktion || "",
        oe: p.oe || "",
        grad: p.grad ?? 100,
        gradBand: gradBand(p.grad ?? 100),
      };
    });
  const byPersonDay = new Map(),
    currentByDay = new Map();
  for (const e of current) {
    if (!currentByDay.has(e.d)) currentByDay.set(e.d, []);
    currentByDay.get(e.d).push(e);
  }
  for (const e of all) {
    const key = `${e.t}|${e.d}`;
    if (!byPersonDay.has(key)) byPersonDay.set(key, []);
    byPersonDay.get(key).push(e);
  }
  const dates = new Set();
  for (const p of people)
    for (
      let day = new Date(p.start + "T00:00:00Z");
      day.toISOString().slice(0, 10) <= p.end;
      day.setUTCDate(day.getUTCDate() + 1)
    )
      if (day.getUTCDay() % 6 !== 0) dates.add(day.toISOString().slice(0, 10));
  // Frozen report clock: opening an offline report later must not create new gaps.
  const fallback = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .split(" ");
  const snapshotDate = data.snapshot_date || fallback[0];
  const snapshotMinute =
    data.snapshot_minute ??
    fallback[1]
      .split(":")
      .reduce((s, v, i) => s + Number(v) * (i === 0 ? 60 : 1), 0);
  const observations = [];
  for (const d of [...dates].sort()) {
    const expected = people.filter((p) => p.start <= d && p.end >= d);
    for (let h = 0; h < 2; h++) {
      const [a, b] = state.windows[h];
      const phase =
        d > snapshotDate || (d === snapshotDate && snapshotMinute < a)
          ? "future"
          : d === snapshotDate && snapshotMinute < b
            ? "ongoing"
            : "completed";
      const captureEnd = phase === "ongoing" ? Math.min(b, snapshotMinute) : b;
      const expectedMinutes = expected.length * (b - a);
      const documented = expected.reduce(
        (s, p) =>
          s + unionMinutes(byPersonDay.get(`${p.i}|${d}`) || [], a, captureEnd),
        0,
      );
      const included =
        phase === "completed" || (phase === "ongoing" && state.includeOngoing);
      observations.push({
        d,
        h,
        wd: (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7,
        a,
        b,
        phase,
        captureEnd,
        included,
        expectedMinutes,
        documented,
        unknown: Math.max(0, expectedMinutes - documented),
        coverage: expectedMinutes ? (100 * documented) / expectedMinutes : null,
        valid: included && documented > 0,
      });
    }
  }
  const considered = observations.filter((o) => o.included);
  const valid = considered.filter(
    (o) => o.valid && o.coverage >= Number(state.minCoverage || 0),
  );
  const coverageOf = (os) => {
    const expected = os.reduce((s, o) => s + o.expectedMinutes, 0);
    return expected
      ? (100 * os.reduce((s, o) => s + o.documented, 0)) / expected
      : null;
  };
  const coverage = coverageOf(considered);
  const windowsByDay = new Map();
  for (const o of valid) {
    if (!windowsByDay.has(o.d)) windowsByDay.set(o.d, []);
    windowsByDay.get(o.d).push(o);
  }
  const minuteTotal = (es) =>
    es.reduce(
      (s, e) =>
        s +
        (windowsByDay.get(e.d) || []).reduce(
          (sum, o) => sum + overlap(e, o.a, o.captureEnd),
          0,
        ),
      0,
    );
  const hasObservedMinutes = (e) =>
    (windowsByDay.get(e.d) || []).some(
      (o) => overlap(e, o.a, o.captureEnd) > 0,
    );
  const selected = all.filter(
    (e) => work(e) && matches(e, state) && hasObservedMinutes(e),
  );
  const scope = all.filter(
    (e) => work(e) && (!state.location || e.ao === state.location),
  );
  const denominator = minuteTotal(
    state.shareBase === "selection" ? selected : scope,
  );
  const coverageCells = Array.from({ length: 10 }, (_, i) => {
    const column = observations.filter(
      (o) => o.wd === Math.floor(i / 2) && o.h === i % 2,
    );
    const os = column.filter((o) => o.included);
    return {
      coverage: coverageOf(os),
      expectedDays: os.length,
      days: os.filter(
        (o) => o.valid && o.coverage >= Number(state.minCoverage || 0),
      ).length,
      unknown: os.reduce((s, o) => s + o.unknown, 0),
      future: column.filter((o) => o.phase === "future").length,
      ongoing: column.filter((o) => o.phase === "ongoing").length,
    };
  });
  const validSlots = new Set(valid.map((o) => o.d + "|" + o.h));
  const rowsFor = (split, second = "", includeDates = false) => {
    const profileFields = [split, second].filter((f) =>
      Object.hasOwn(PROFILES, f),
    );
    const keys = new Set(selected.map((e) => keyOf(e, split, second)));
    const profileValue = (p, f) =>
      String(f === "gradBand" ? gradBand(p.grad ?? 100) : (p[f] ?? ""));
    if (profileFields.length && profileFields.length === (second ? 2 : 1))
      for (const p of people)
        keys.add(
          JSON.stringify([
            profileValue(p, split),
            ...(second ? [profileValue(p, second)] : []),
          ]),
        );
    return [...keys].sort().map((key) => {
      const parts = JSON.parse(key);
      const rowPeople = profileFields.length
        ? people.filter((p) =>
            [split, second].every(
              (f, i) =>
                !Object.hasOwn(PROFILES, f) || profileValue(p, f) === parts[i],
            ),
          )
        : people;
      // A documented day in another OE cannot turn this OE's missing day into zero.
      const rowObservations = profileFields.length
        ? considered
            .map((o) => {
              const ps = rowPeople.filter(
                (p) => p.start <= o.d && p.end >= o.d,
              );
              const documented = ps.reduce(
                (s, p) =>
                  s +
                  unionMinutes(
                    byPersonDay.get(`${p.i}|${o.d}`) || [],
                    o.a,
                    o.captureEnd,
                  ),
                0,
              );
              const expectedMinutes = ps.length * (o.b - o.a);
              return {
                ...o,
                documented,
                expectedMinutes,
                coverage: expectedMinutes
                  ? (100 * documented) / expectedMinutes
                  : null,
              };
            })
            .filter((o) => o.expectedMinutes > 0)
        : considered;
      const rowValid = profileFields.length
        ? rowObservations.filter(
            (o) => o.documented > 0 && validSlots.has(o.d + "|" + o.h),
          )
        : valid;
      const es = selected.filter((e) => keyOf(e, split, second) === key),
        byDay = new Map();
      for (const e of es) {
        if (!byDay.has(e.d)) byDay.set(e.d, []);
        byDay.get(e.d).push(e);
      }
      const valuesBySlot = new Map();
      const values = rowValid.map((o) => {
        const here = (byDay.get(o.d) || []).filter(
          (e) => overlap(e, o.a, o.captureEnd) > 0,
        );
        const observation = {
          ...o,
          n:
            here.reduce((s, e) => s + overlap(e, o.a, o.captureEnd), 0) /
            (o.b - o.a),
          heads: new Set(here.map((e) => e.u)).size,
        };
        if (includeDates) valuesBySlot.set(o, observation);
        return observation;
      });
      const peak = values.reduce(
        (best, o) => (!best || o.n > best.n ? o : best),
        null,
      );
      const minutes = minuteTotal(es);
      return {
        key,
        name: keyLabel(key, split, second),
        minutes,
        share: denominator ? (100 * minutes) / denominator : 0,
        average: mean(values.map((o) => o.n)),
        coverage: coverageOf(rowObservations),
        people: new Set(rowPeople.map((p) => p.u)).size,
        days: rowValid.length,
        timeline: includeDates
          ? rowObservations.map((o) => ({
              d: o.d,
              h: o.h,
              wd: o.wd,
              coverage: o.coverage,
              n: valuesBySlot.get(o)?.n ?? null,
            }))
          : undefined,
        morning: mean(values.filter((o) => o.h === 0).map((o) => o.n)),
        afternoon: mean(values.filter((o) => o.h === 1).map((o) => o.n)),
        peak,
        cells: coverageCells.map((c, i) => {
          const vs = values.filter(
            (o) => o.wd === Math.floor(i / 2) && o.h === i % 2,
          );
          const top = vs.reduce(
            (best, o) => (!best || o.n > best.n ? o : best),
            null,
          );
          return {
            ...c,
            ...(profileFields.length
              ? {
                  coverage: coverageOf(
                    rowObservations.filter(
                      (o) => o.wd === Math.floor(i / 2) && o.h === i % 2,
                    ),
                  ),
                  expectedDays: rowObservations.filter(
                    (o) => o.wd === Math.floor(i / 2) && o.h === i % 2,
                  ).length,
                  days: vs.length,
                }
              : {}),
            mean: mean(vs.map((o) => o.n)),
            max: top?.n ?? null,
            date: top?.d,
            peakCoverage: top?.coverage ?? null,
            heads: mean(vs.map((o) => o.heads)),
          };
        }),
      };
    });
  };
  // Cluster the selected submission cohort before profile/activity filters.
  const meetingValues = valid.map((o) => {
    let integral = 0;
    for (let t = o.a; t < o.captureEnd; t += 15) {
      const end = Math.min(t + 15, o.captureEnd),
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
        const n =
          e.tk === "STANDORTINTERN"
            ? Math.max(1, Math.round(reporters.length / (SIZE[e.gg] || 1)))
            : reporters.length;
        integral += ((n * chosen.length) / reporters.length) * (end - t);
      }
    }
    return { ...o, n: integral / (o.b - o.a) };
  });
  const recordedWork = current.filter(work);
  const options = {},
    optionCounts = {};
  for (const f of Object.keys(FIELDS)) {
    const es = all.filter(
      (e) => work(e) && matches(e, state, f) && hasObservedMinutes(e),
    );
    options[f] = [
      ...new Set(
        recordedWork
          .map((e) => fieldValue(e, f))
          .concat(state.filters[f] || []),
      ),
    ].sort();
    optionCounts[f] = Object.fromEntries(
      options[f].map((v) => [
        v,
        es.filter((e) => fieldValue(e, f) === v).length,
      ]),
    );
  }
  for (const f of Object.keys(PROFILES)) {
    const pv = (p) =>
      String(f === "gradBand" ? gradBand(p.grad ?? 100) : (p[f] ?? ""));
    options[f] = [
      ...new Set(compatible.map(pv).concat(state.filters[f] || [])),
    ].sort((a, b) =>
      f === "grad" ? Number(a) - Number(b) : a.localeCompare(b, "de"),
    );
    optionCounts[f] = Object.fromEntries(
      options[f].map((v) => [
        v,
        compatible.filter((p) => profileMatches(p, f) && pv(p) === v).length,
      ]),
    );
  }
  const totalFor = (os) =>
    os.length
      ? mean(
          os.map(
            (o) =>
              selected
                .filter((e) => e.d === o.d)
                .reduce((s, e) => s + overlap(e, o.a, o.captureEnd), 0) /
              (o.b - o.a),
          ),
        )
      : null;
  const timeline = considered.map((o) => ({
    ...o,
    n: valid.includes(o) ? totalFor([o]) : null,
  }));
  const weeks = [
    ...new Set(
      timeline.map((o) => {
        const d = new Date(o.d + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - o.wd);
        return d.toISOString().slice(0, 10);
      }),
    ),
  ].map((start) => {
    const end = new Date(start + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() + 6);
    const os = valid.filter(
      (o) => o.d >= start && o.d <= end.toISOString().slice(0, 10),
    );
    return {
      start,
      n: totalFor(os),
      days: os.length,
      coverage: coverageOf(
        considered.filter(
          (o) => o.d >= start && o.d <= end.toISOString().slice(0, 10),
        ),
      ),
    };
  });
  const datedEntries = all.filter((e) => considered.some((o) => o.d === e.d));
  const totals = {
    average: totalFor(valid),
    peak: timeline
      .filter((o) => o.n != null)
      .reduce((best, o) => (!best || o.n > best.n ? o : best), null),
    cells: coverageCells.map((c, i) => {
      const values = timeline.filter(
        (o) => o.wd === Math.floor(i / 2) && o.h === i % 2 && o.n != null,
      );
      return {
        mean: mean(values.map((o) => o.n)),
        max: values.length ? Math.max(...values.map((o) => o.n)) : null,
      };
    }),
  };
  const profileDimension = [state.split, state.second].find((f) =>
    Object.hasOwn(PROFILES, f),
  );
  return {
    mode,
    people: new Set(people.map((p) => p.u)).size,
    submitted: people.filter((p) => p.eingereicht).length,
    drafts: people.filter((p) => !p.eingereicht).length,
    started: people.filter((p) => active.has(p.i)).length,
    notStarted: people.filter((p) => !active.has(p.i)).length,
    legacyEntries: data.eintraege.filter((e) => !e.v2 && cohortIds.has(e.t))
      .length,
    excludedPeople: cohort.filter(
      (p) => legacy.has(p.i) && !active.has(p.i) && profileMatches(p),
    ).length,
    valid: valid.length,
    expected: considered.length,
    excluded: considered.length - valid.length,
    coverage,
    coverageCells,
    lowCoverage: considered.filter((o) => o.coverage < state.threshold).length,
    unknownMinutes: considered.reduce((s, o) => s + o.unknown, 0),
    documentedMinutes: considered.reduce((s, o) => s + o.documented, 0),
    future: observations.filter((o) => o.phase === "future").length,
    ongoing: observations.filter((o) => o.phase === "ongoing").length,
    denominator,
    selectedMinutes: minuteTotal(selected),
    options,
    optionCounts,
    matchedPeople: new Set(selected.map((e) => e.u)).size,
    qualityExcluded: considered.filter(
      (o) => o.valid && o.coverage < Number(state.minCoverage || 0),
    ).length,
    totalAverage: totals.average,
    totals,
    timeline,
    weeks,
    outside: datedEntries
      .filter((e) => work(e) && matches(e, state))
      .reduce(
        (s, e) =>
          s +
          (e.bis - e.von) -
          state.windows.reduce((v, [a, b]) => v + overlap(e, a, b), 0),
        0,
      ),
    absences: Object.keys(LABELS.absence).map((reason) => ({
      name: LABELS.absence[reason],
      minutes: minuteTotal(all.filter((e) => e.absence === reason)),
    })),
    rows: rowsFor(state.split, state.second, true),
    groupBases:
      state.second && profileDimension
        ? rowsFor(profileDimension, "", true)
        : [],
    cross: rowsFor("form", "room"),
    locations: rowsFor("ao"),
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
    eligible: validSlots,
  };
}

// Minimise an offline report to the selected submission cohort; no hidden drafts.
export function reportDataset(data, state) {
  if (state.mode !== "submitted") return data;
  const people = data.teilnehmer.filter((p) => p.eingereicht),
    ids = new Set(people.map((p) => p.i));
  return {
    ...data,
    teilnehmer: people,
    eintraege: data.eintraege.filter((e) => ids.has(e.t)),
    includes_drafts: false,
    default_mode: "submitted",
  };
}

const copy = (x) => JSON.parse(JSON.stringify(x));
const displayValue = (f, v) => {
  if (v === "na" || v === "missing" || Object.hasOwn(LABELS, f))
    return label(f, v);
  return (
    (v === "" ? "Nicht angegeben" : String(v)) + (f === "grad" ? " %" : "")
  );
};
const dateLabel = (d) =>
  d
    ? new Intl.DateTimeFormat("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(d + "T00:00:00Z"))
    : "–";
const numberLabel = (n) =>
  n == null ? "Keine Angaben" : n > 0 && n < 0.5 ? "<1" : round(n);
const PRESETS = [
  {
    name: "Wofür werden die Plätze am Standort genutzt?",
    crossBy: "room",
    split: "form",
    second: "room",
    location: "UEBLICHER_ARBEITSPLATZ",
    tab: "cross",
  },
  {
    name: "Wann wird am Büroarbeitsplatz telefoniert oder online getagt?",
    split: "oe",
    second: "",
    location: "UEBLICHER_ARBEITSPLATZ",
    filters: { form: ["ONLINE"], room: ["ARBEITSPLATZ"] },
    tab: "week",
  },
  {
    name: "Wie unterscheiden sich die Tätigkeiten der Organisationseinheiten?",
    split: "oe",
    second: "form",
    location: "",
    tab: "custom",
  },
  {
    name: "Wo arbeiten Personen je nach Funktion?",
    split: "funktion",
    second: "ao",
    location: "",
    tab: "custom",
  },
  {
    name: "Wie gross sind die Gruppen bei der Zusammenarbeit vor Ort?",
    split: "gg",
    second: "tk",
    location: "UEBLICHER_ARBEITSPLATZ",
    filters: { form: ["MEETING"] },
    tab: "custom",
  },
  {
    name: "Bei welchen Gruppengrössen kommen Online-Zuschaltungen vor?",
    split: "gg",
    second: "hybrid",
    location: "UEBLICHER_ARBEITSPLATZ",
    filters: { form: ["MEETING"] },
    tab: "custom",
  },
];

function crossTable(rows, direction) {
  const byPlace = direction === "room";
  const groups = new Map();
  const columns = new Set();
  for (const entry of rows) {
    const [form, place] = JSON.parse(entry.key);
    const key = byPlace ? place : form;
    const column = byPlace ? form : place;
    if (!groups.has(key))
      groups.set(key, { key, minutes: 0, cells: new Map() });
    const row = groups.get(key);
    row.minutes += entry.minutes;
    row.cells.set(column, entry.minutes);
    columns.add(column);
  }
  return {
    rowField: byPlace ? "room" : "form",
    colField: byPlace ? "form" : "room",
    rows: [...groups.values()],
    columns: [...columns],
  };
}

function sharedSlots(a, b) {
  let common = 0;
  for (const key of a) if (b.has(key)) common++;
  return { common, different: common !== a.size || common !== b.size };
}

function comparisonRows(current, reference, state) {
  const indexed = (rows) => new Map(rows.map((row) => [row.key, row]));
  const left = indexed(current.rows),
    right = indexed(reference.rows);
  const dimensions = [state.split, state.second];
  const profileIndex = dimensions.findIndex((f) => Object.hasOwn(PROFILES, f));
  const mixed =
    state.second &&
    dimensions.filter((f) => Object.hasOwn(PROFILES, f)).length === 1;
  const leftBases = indexed(current.groupBases),
    rightBases = indexed(reference.groupBases);
  // A missing activity is zero only on dates with records for the same person group.
  function values(key, row, result, bases) {
    const base =
      row ||
      (mixed
        ? bases.get(JSON.stringify([JSON.parse(key)[profileIndex]]))
        : null);
    const dates = base
      ? base.timeline
      : profileIndex < 0
        ? result.timeline
        : [];
    const slots = new Set(
      dates.filter((o) => o.n != null).map((o) => o.d + "|" + o.h),
    );
    return {
      average: slots.size ? (row?.average ?? 0) : null,
      share: slots.size && result.denominator ? (row?.share ?? 0) : null,
      slots,
    };
  }
  return [...new Set([...left.keys(), ...right.keys()])].map((key) => {
    const a = left.get(key),
      b = right.get(key);
    const av = values(key, a, current, leftBases),
      bv = values(key, b, reference, rightBases);
    return {
      name: (a || b).name,
      current: av,
      reference: bv,
      delta: av.share == null || bv.share == null ? null : av.share - bv.share,
      differentDays:
        profileIndex >= 0 && sharedSlots(av.slots, bv.slots).different,
    };
  });
}

export function mountDashboard(
  root,
  data,
  initial = {},
  onExport = null,
  onState = null,
) {
  const startView = () => ({
    ...copy(DEFAULTS),
    mode:
      data.includes_drafts === false
        ? "submitted"
        : data.default_mode || DEFAULTS.mode,
  });
  let state = {
    ...startView(),
    ...copy(initial),
    filters: copy(initial.filters || {}),
  };
  // Earlier saved views used a second, redundant location filter.
  if (state.filters.ao?.length) {
    state.location = state.filters.ao.length === 1 ? state.filters.ao[0] : "";
    if (state.filters.ao.length === 1) delete state.filters.ao;
  }
  const initialDetail = state.detailTrigger;
  delete state.detailTrigger;
  const storageKey = "abw-dashboard-views-v2:" + data.gruppen_namen.join("|");
  let views = [],
    currentView = "",
    detail = null,
    message = "";
  const panels = new Set(),
    searches = {};
  try {
    views = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(views)) views = [];
  } catch {
    /* Session-only views still work. */
  }
  const select = (key, title, options, current) =>
    `<label>${esc(title)}<select id="ad-setting-${key}" data-setting="${key}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(current) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  const button = (action, text) =>
    `<button type="button" data-action="${action}">${text}</button>`;
  const filterSummary = (s) =>
    [
      s.location ? label("ao", s.location) : "Alle Arbeitsorte",
      ...Object.entries(s.filters || {}).flatMap(([f, vs]) =>
        (vs || []).map((v) => `${allFields[f] || f}: ${displayValue(f, v)}`),
      ),
    ].join(" · ");
  const basisText = () =>
    state.shareBase === "selection"
      ? "100 % sind alle Arbeitsstunden, die zu deinen Filtern passen"
      : "100 % sind alle erfassten Arbeitsstunden der gewählten Personen am gewählten Arbeitsort";
  function readingGuide(r) {
    const hours = round(r.selectedMinutes / 60);
    return `<details data-panel="reading" class="ad-reading"><summary>So liest du die Auswertung</summary>
      <h3>Wessen Arbeitszeit sehe ich?</h3>
      <p>Deine Auswahl umfasst ${r.people} Personen. ${r.matchedPeople} davon haben im betrachteten Zeitraum passende Tätigkeiten eingetragen. Zusammen sind das rund ${hours} Arbeitsstunden. Unter «Arbeitsort» kannst du zum Beispiel zwischen Standort und Homeoffice wechseln.</p>
      <h3>Was bedeutet «Personen im Mittel»?</h3>
      <p>Ein Beispiel für einen vierstündigen Vormittag: Zwei Personen arbeiten je zwei Stunden am Büroarbeitsplatz. Zusammen haben sie den Platztyp vier Stunden genutzt. In der Tabelle ergibt das im Mittel eine Person. Ob die beiden gleichzeitig dort waren, lässt sich daraus nicht ablesen.</p>
      <h3>Wie lese ich das Wochenprofil?</h3>
      <p>Unter «Dienstagvormittag» fassen wir die Dienstagvormittage der Erhebung zusammen. «Durchschnitt» zeigt den Mittelwert dieser Vormittage. «Höchster erfasster Halbtag» zeigt den Vormittag mit dem höchsten Wert. Klicke auf die Zahl, um die einzelnen Daten zu sehen. Die höchsten Werte zweier Zeilen können von verschiedenen Tagen stammen.</p>
      <h3>Wie viel wurde überhaupt erfasst?</h3>
      <p>Für die Vollständigkeit zählt jeder Eintrag, auch Homeoffice und Abwesenheiten. ${r.coverage == null ? "Für diese Auswahl liegt noch kein auswertbarer Zeitraum vor." : `Für die gewählten Personen gibt es für rund ${round(r.coverage)} von 100 betrachteten Stunden einen Eintrag.`} Bei einer Lücke bleibt offen, wo oder ob jemand gearbeitet hat. Ein Wechsel der Tätigkeit oder des Arbeitsorts ändert diese Kennzahl nicht.</p>
      <h3>Was bedeuten 0, &lt;1 und der Strich?</h3>
      <p>Bei den Personenzahlen bedeutet 0: Es gibt Einträge, aber keine passende Arbeitszeit. &lt;1 steht für einen kleinen positiven Wert, der auf ganze Personen gerundet null ergäbe. Ein Strich (–) bedeutet, dass für diesen Wert kein Halbtag ausgewertet werden konnte. Halbtage ganz ohne Einträge lassen wir beim Durchschnitt aus. Teilweise erfasste Halbtage zählen mit den eingetragenen Stunden.</p>
      <p>Die Zahlen sind gerundet. Sie zeigen, wie die Teilnehmenden gearbeitet haben. Für eine Raumplanung ist zusätzlich wichtig, ob die vorhandenen Plätze für diese Tätigkeiten geeignet waren.</p></details>`;
  }
  function bars(rows, kind = "share", maximum = 100) {
    if (!rows.length)
      return '<p class="ad-empty">Keine passenden Tätigkeiten in den ausgewerteten Halbtagen.</p>';
    return rows
      .map((row) => {
        const n = row[kind];
        return `<div class="ad-bar-row"><span>${esc(row.name)}</span><div class="ad-track"><div style="width:${n == null ? 0 : Math.min(100, (100 * n) / Math.max(maximum, 1))}%"></div></div><strong>${n == null ? "–" : esc(numberLabel(n))}${kind === "share" ? " %" : ""}</strong></div>`;
      })
      .join("");
  }
  function matrix(r, reference) {
    // The cohort size is a stable scale for the current and pinned selection.
    const max = Math.max(1, r.people, reference?.people || 0);
    const chosen = state.metric === "peak" ? "max" : "mean";
    return `<div class="ad-scroll"><table class="ad-week-table"><caption>${state.metric === "peak" ? "Höchster erfasster Halbtag je Wochentag" : "Durchschnitt nach Wochentag"} · Personen im Mittel über das jeweilige Zeitfenster · ${esc(allFields[state.split])}${state.second ? " / " + esc(allFields[state.second]) : ""}</caption><colgroup><col class="ad-week-label"><col span="10"><col span="2"></colgroup><thead><tr><th scope="col">${esc(allFields[state.split])}</th>${DAYS.map((d) => `<th colspan="2" scope="colgroup">${d}</th>`).join("")}<th scope="col" rowspan="2">Ø je Halbtag</th><th scope="col" rowspan="2">Höchster Halbtag</th></tr><tr><th></th>${DAYS.map(() => '<th scope="col"><span class="ad-screen-only">Vormittag</span><span class="ad-print-label">Vorm.</span></th><th scope="col"><span class="ad-screen-only">Nachmittag</span><span class="ad-print-label">Nachm.</span></th>').join("")}</tr></thead><tbody>${r.rows.length ? r.rows.map((row, ri) => `<tr><th scope="row">${esc(row.name)}</th>${row.cells.map((c, i) => `<td><button type="button" class="ad-cell ${c.coverage != null && c.coverage < state.threshold ? "ad-incomplete" : ""}" id="ad-cell-${ri}-${i}" data-cell="${ri},${i}" style="--heat:${c[chosen] == null ? 0 : 0.06 + (0.34 * c[chosen]) / max}" aria-label="${esc(row.name)}, ${DAYS[Math.floor(i / 2)]} ${i % 2 ? "Nachmittag" : "Vormittag"}: ${esc(numberLabel(c[chosen]))}${c.coverage != null && c.coverage < state.threshold ? ", Angaben lückenhaft" : ""}">${c[chosen] == null ? "–" : esc(numberLabel(c[chosen]))}${state.metric === "peak" ? (c.peakCoverage != null && c.peakCoverage < state.threshold ? " *" : "") : c.coverage != null && c.coverage < state.threshold ? " *" : ""}</button></td>`).join("")}<td>${esc(numberLabel(row.average))}</td><td>${esc(numberLabel(row.peak?.n))}${row.peak?.coverage < state.threshold ? " *" : ""}</td></tr>`).join("") : '<tr><td colspan="13">Keine passenden Tätigkeiten. Prüfe die Auswahl und die Vollständigkeit der Angaben.</td></tr>'}</tbody><tfoot><tr class="ad-total-row"><th scope="row">Gesamte Auswahl</th>${r.totals.cells.map((c, i) => `<td><button type="button" class="ad-cell" id="ad-total-${i}" data-cell="total,${i}" aria-label="Gesamte Auswahl, ${DAYS[Math.floor(i / 2)]} ${i % 2 ? "Nachmittag" : "Vormittag"}, einzelne Halbtage anzeigen">${c[chosen] == null ? "–" : esc(numberLabel(c[chosen]))}</button></td>`).join("")}<td>${esc(numberLabel(r.totals.average))}</td><td>${esc(numberLabel(r.totals.peak?.n))}</td></tr><tr class="ad-coverage-row"><th scope="row">Vollständigkeit der Angaben</th>${r.coverageCells.map((c, i) => `<td><button type="button" data-coverage="${i}" id="ad-coverage-${i}" class="${c.coverage != null && c.coverage < state.threshold ? "ad-coverage-low" : ""}">${c.coverage == null ? (c.ongoing ? "Läuft" : c.future ? "Später" : "–") : percent(c.coverage)}</button></td>`).join("")}<td colspan="2">${percent(r.coverage)}</td></tr><tr><th scope="row">Ausgewertete / bisherige Halbtage</th>${r.coverageCells.map((c) => `<td>${c.expectedDays ? `${c.days} / ${c.expectedDays}` : "–"}</td>`).join("")}<td colspan="2">${r.valid} / ${r.expected}</td></tr></tfoot></table></div><p class="ad-context">Klicke auf einen Vor- oder Nachmittag, um die einzelnen Daten zu sehen. 0 bedeutet: Es gibt Einträge, aber keine passende Tätigkeit. Ein Strich (–) bedeutet: Es fehlt ein auswertbarer Halbtag. Ein Stern (*) markiert Werte mit weniger als 85 % erfasster Zeit. Beim höchsten Wert zählt die Vollständigkeit dieses einen Halbtags.</p><p class="ad-context">Je dunkler das Feld, desto mehr Personen waren im Mittel mit der Tätigkeit beschäftigt (Skala bis ${round(max)}). Für die Gesamtzahl lies die Zeile «Gesamte Auswahl». Einzelne Gruppen können an unterschiedlichen Tagen Angaben gemacht haben.</p>`;
  }
  function stacked(r) {
    if (!state.second || !r.rows.length) return "";
    const colors = [
      "#2563eb",
      "#0f766e",
      "#9333ea",
      "#b45309",
      "#be185d",
      "#475569",
      "#4d7c0f",
      "#0369a1",
    ];
    const keys = [...new Set(r.rows.map((x) => JSON.parse(x.key)[1]))];
    const first = [...new Set(r.rows.map((x) => JSON.parse(x.key)[0]))];
    const bases = new Map(
      r.groupBases.map((row) => [JSON.parse(row.key)[0], row]),
    );
    return `<h3>Verteilung innerhalb der Gruppen</h3><p>Jeder Balken steht für alle ausgewählten Arbeitsstunden einer Gruppe. Die Farben zeigen, wie sich ihre Stunden verteilen. Unter dem Balken siehst du, auf wie vielen Stunden und Personen der Vergleich beruht.</p><div class="ad-legend">${keys.map((k, i) => `<span><i style="background:${colors[i % colors.length]}"></i>${esc(displayValue(state.second, k))}</span>`).join("")}</div>${first
      .map((k) => {
        const rows = r.rows.filter((x) => JSON.parse(x.key)[0] === k),
          total = rows.reduce((s, x) => s + x.minutes, 0);
        const base = Object.hasOwn(PROFILES, state.split) ? bases.get(k) : r;
        return `<div class="ad-stack-row"><strong>${esc(displayValue(state.split, k))}</strong><div class="ad-stack">${rows
          .map((x) => {
            const v = JSON.parse(x.key)[1],
              share = total ? (100 * x.minutes) / total : 0;
            return `<span style="width:${share}%;background:${colors[keys.indexOf(v) % colors.length]}" title="${esc(displayValue(state.second, v))}: ${percent(share)}" aria-label="${esc(displayValue(state.second, v))}: ${percent(share)}">${share >= 12 ? percent(share) : ""}</span>`;
          })
          .join(
            "",
          )}</div><small>${round(total / 60)} h Arbeitszeit dokumentiert · ${percent(base.coverage)} der Zeit dokumentiert · ${base.people} berücksichtigte Personen</small></div>`;
      })
      .join("")}`;
  }
  function cross(r, atSite) {
    if (!atSite)
      return `<section><h3>Tätigkeiten und Plätze</h3><p>Plätze werden am untersuchten Standort erfasst.</p>${button("use-site", "Untersuchten Standort anzeigen")}</section>`;
    const table = crossTable(r.cross, state.crossBy);
    const byPlace = state.crossBy === "room";
    return `<section><h3>Tätigkeiten und Plätze</h3>
      ${select(
        "crossBy",
        "Fragestellung",
        [
          ["form", "Wo findet diese Tätigkeit statt?"],
          ["room", "Wofür wird dieser Platz genutzt?"],
        ],
        state.crossBy,
      )}
      <p>${byPlace ? "Jede Zeile zeigt, wie sich die dokumentierte Zeit an einem Platz auf Tätigkeiten verteilt." : "Jede Zeile zeigt, wie sich die dokumentierte Zeit einer Tätigkeit auf Plätze verteilt."} 100 % entsprechen der Summe am Zeilenende.</p>
      <div class="ad-scroll"><table><caption>${byPlace ? "Tätigkeiten je Platz" : "Plätze je Tätigkeit"} · dokumentierte Stunden und Anteil je Zeile</caption>
      <thead><tr><th scope="col">${esc(FIELDS[table.rowField])}</th>${table.columns.map((c) => `<th scope="col">${esc(displayValue(table.colField, c))}</th>`).join("")}<th scope="col">Gesamt</th></tr></thead>
      <tbody>${
        table.rows
          .map(
            (row) =>
              `<tr><th scope="row">${esc(displayValue(table.rowField, row.key))}</th>${table.columns
                .map((c) => {
                  const minutes = row.cells.get(c) || 0;
                  return `<td>${round(minutes / 60)} h<br><small>${percent((100 * minutes) / row.minutes)}</small></td>`;
                })
                .join("")}<td>${round(row.minutes / 60)} h</td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="${table.columns.length + 2}">Keine passenden Tätigkeiten.</td></tr>`
      }</tbody></table></div>
      ${!state.location ? "<p>«Nicht anwendbar» umfasst Tätigkeiten ausserhalb des untersuchten Standorts.</p>" : ""}</section>`;
  }

  function comparison(r, reference, shareControl) {
    if (!reference) return "";
    const rows = comparisonRows(r, reference, state);
    const overlap = sharedSlots(r.eligible, reference.eligible);
    const currentName = filterSummary(state);
    const referenceName = filterSummary(state.comparison);
    const cell = (value, max) =>
      `<td><div class="ad-track"><div style="width:${(100 * (value.average || 0)) / max}%"></div></div>${esc(numberLabel(value.average))} / ${percent(value.share)}</td>`;
    const max = Math.max(
      1,
      ...rows.map((row) =>
        Math.max(row.current.average || 0, row.reference.average || 0),
      ),
    );
    const basis = (result) =>
      `${result.people} berücksichtigte Personen · ${percent(result.coverage)} der Zeit dokumentiert · ${result.valid} ausgewertete Halbtage`;
    return `<section id="ad-comparison" tabindex="-1"><h3>Vergleich der Auswahlen</h3>
      <div class="ad-two"><div><h4>Aktuelle Auswahl · ${esc(currentName)}</h4><p>${basis(r)}</p></div>
      <div><h4>Festgehaltene Auswahl · ${esc(referenceName)}</h4><p>${basis(reference)}</p></div></div>
      <p${overlap.different ? ' class="ad-notice"' : ""}>${overlap.different ? "Die Auswahlen beruhen auf unterschiedlichen Halbtagen." : "Beide Auswahlen beruhen auf denselben Halbtagen."} Gemeinsam ausgewertete Halbtage: ${overlap.common}.${rows.some((row) => row.differentDays) ? " Unterschiede innerhalb einzelner Zeilen sind in der Tabelle gekennzeichnet." : ""}</p>
      ${shareControl}<p>${esc(basisText())}. Ein Beispiel: 40 % in der aktuellen und 30 % in der festgehaltenen Auswahl ergeben +10 Prozentpunkte.</p>
      <div class="ad-scroll"><table><thead><tr><th scope="col">${esc(allFields[state.split])}${state.second ? " / " + esc(allFields[state.second]) : ""}</th>
      <th scope="col">${esc(currentName)}<br>Ø Personen / Zeitanteil</th><th scope="col">${esc(referenceName)}<br>Ø Personen / Zeitanteil</th><th scope="col">Differenz in Prozentpunkten</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><th scope="row">${esc(row.name)}${row.differentDays ? "<br><small>Unterschiedliche Halbtage</small>" : ""}</th>${cell(row.current, max)}${cell(row.reference, max)}<td>${row.delta == null ? "–" : (Math.round(row.delta) > 0 ? "+" : "") + round(Math.round(row.delta) || 0)}</td></tr>`).join("")}</tbody></table></div>
      <p class="ad-context">Balken zeigen Personen im Mittel auf derselben Skala (0–${round(max)}).</p><div class="ad-actions">${button("pin", "Festgehaltene Auswahl ersetzen")}${button("unpin", "Vergleich entfernen")}</div></section>`;
  }

  function detailPanel() {
    if (!detail) return "";
    const list = detail.dates;
    return `<aside class="ad-detail" tabindex="-1" aria-label="Details zum Halbtag"><h4>${esc(detail.title)}</h4><p>${esc(detail.text)}</p>
      ${
        list
          ? list.length
            ? `<div class="ad-scroll"><table><caption>Einzelne Halbtage</caption><thead><tr><th scope="col">Datum</th><th scope="col">Personen im Mittel</th><th scope="col">Zeit dokumentiert</th></tr></thead><tbody>
      ${list.map((o) => `<tr><th scope="row">${dateLabel(o.d)}</th><td>${o.n != null ? esc(numberLabel(o.n)) : o.coverage > 0 ? "Wegen Mindestvollständigkeit ausgelassen" : "Keine Angaben"}</td><td>${percent(o.coverage)}</td></tr>`).join("")}</tbody></table></div>`
            : "<p>Für diesen Wochenhalbtag ist bisher kein Halbtag fällig.</p>"
          : ""
      }
      ${button("close-detail", "Details schliessen")}</aside>`;
  }

  function peakSummary(r) {
    const peak = r.totals.peak;
    if (!peak || !peak.n) return "";
    const ties = r.timeline.filter((o) => o.n === peak.n).length;
    return `<section class="ad-peak"><div><h3>Wann war am meisten los?</h3>
      <p><strong>${esc(numberLabel(peak.n))} Personen im Mittel</strong> · ${DAYS[peak.wd]}, ${dateLabel(peak.d)} ${peak.h ? "Nachmittag" : "Vormittag"} · ${percent(peak.coverage)} der Zeit dokumentiert</p>
      <small>${ties > 1 ? `Diesen Wert erreichten ${ties} Halbtage. ` : ""}An diesem Vor- oder Nachmittag arbeiteten im Durchschnitt am meisten Personen an den ausgewählten Tätigkeiten. Ausgewertet wurden ${r.valid} von ${r.expected} bisherigen Halbtagen.</small></div>
      ${button("peak-days", "Einzelne Halbtage ansehen")}</section>`;
  }
  function render() {
    const focused = document.activeElement;
    const focusId = focused && root.contains(focused) ? focused.id : "";
    const caret = focused?.selectionStart;
    const filterScroll = [
      ...root.querySelectorAll("[data-field] .ad-options"),
    ].map((list) => [list.parentElement.dataset.field, list.scrollTop]);
    const openDetails = [
      ...root.querySelectorAll("details[open][data-panel]"),
    ].map((d) => d.dataset.panel);
    let r;
    try {
      r = calculateDashboard(data, state);
    } catch (e) {
      root.innerHTML = `<p role="alert">${esc(e.message)}</p>${button("reset-windows", "Tageszeiten zurücksetzen")}`;
      return;
    }
    state.mode = r.mode;
    const snapshot = data.snapshot_at
      ? new Intl.DateTimeFormat("de-CH", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Europe/Zurich",
        }).format(new Date(data.snapshot_at))
      : "Zeitpunkt des Abrufs";
    const fields = Object.entries(allFields).filter(
      ([f]) => r.options[f]?.length,
    );
    const active = Object.entries(state.filters).flatMap(([f, vs]) =>
      (vs || []).map(
        (v) =>
          `<button type="button" class="ad-chip" data-remove="${esc(f)}" data-value="${esc(v)}" aria-label="Filter ${esc(allFields[f])}: ${esc(displayValue(f, v))} entfernen">${esc(allFields[f])}: ${esc(displayValue(f, v))} <span aria-hidden="true">×</span></button>`,
      ),
    );
    const filters = Object.entries({ ...FIELDS, ...PROFILES })
      .filter(([f]) => f !== "ao")
      .map(([f, title]) => {
        const options = r.options[f],
          search = searches[f] || "",
          shown = options.filter((v) =>
            displayValue(f, v)
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()),
          );
        return `<fieldset class="ad-filter" data-field="${f}"><legend>${esc(title)}</legend>${options.length > 6 ? `<input type="search" id="ad-search-${f}" data-search="${f}" value="${esc(search)}" placeholder="Suchen …" aria-label="${esc(title)} durchsuchen">` : ""}<div class="ad-filter-actions"><button type="button" data-all="${f}" ${shown.some((v) => r.optionCounts[f][v] > 0) ? "" : "disabled"}>Alle verfügbaren auswählen</button><button type="button" data-clear="${f}">Zurücksetzen</button></div><div class="ad-options">${
          shown
            .map((v) => {
              const n = r.optionCounts[f]?.[v] || 0,
                checked = state.filters[f]?.includes(v);
              return `<label class="ad-check"><input type="checkbox" id="ad-filter-${f}-${options.indexOf(v)}" data-filter="${f}" value="${esc(v)}" ${checked ? "checked" : ""} ${!n && !checked ? "disabled" : ""}><span>${esc(displayValue(f, v))}</span></label>`;
            })
            .join("") ||
          (search
            ? "<p>Kein Wert passt zur Suche.</p>"
            : "<p>Hierzu gibt es keine Angaben.</p>")
        }</div><small>${Object.hasOwn(PROFILES, f) ? "Wählt aus, wer zur Gruppe gehört." : "Wählt aus, welche Arbeitszeiten zählen."}</small></fieldset>`;
      })
      .join("");
    const timeText = state.windows
      .map((w) => w.map(clock).join("–"))
      .join(" und ");
    const atSite =
      !state.location || state.location === "UEBLICHER_ARBEITSPLATZ";
    const reference = state.comparison
      ? calculateDashboard(data, {
          ...state,
          ...state.comparison,
          comparison: null,
        })
      : null;
    const shareControl = `<div class="ad-toolbar ad-share-control">${select(
      "shareBase",
      "Was zählt als 100 %?",
      [
        ["scope", "Alle Arbeitsstunden am gewählten Ort"],
        ["selection", "Nur die Arbeitsstunden, die zu meinen Filtern passen"],
      ],
      state.shareBase,
    )}</div>`;
    const byTime = (rows) => [...rows].sort((a, b) => b.minutes - a.minutes);
    const leadingActivity = byTime(r.activities)[0];
    let activityExample = "";
    if (leadingActivity && r.denominator > 0) {
      activityExample = `<p>Auf «${esc(leadingActivity.name)}» entfallen rund ${round(leadingActivity.minutes / 60)} von ${round(r.denominator / 60)} erfassten Arbeitsstunden (${percent(leadingActivity.share)}).</p>`;
    }
    let body = "";
    if (state.tab === "overview")
      body = `${peakSummary(r)}${shareControl}<div class="${atSite ? "ad-two" : ""}"><section><h3>So verteilt sich die Arbeitszeit</h3>${activityExample}<p>${esc(basisText())}.</p>${bars(byTime(r.activities))}</section>${atSite ? `<section><h3>An diesen Plätzen wird gearbeitet</h3><p>${esc(basisText())}. Plätze werden am untersuchten Standort erfasst.</p>${bars(byTime(r.places.filter((row) => JSON.parse(row.key)[0] !== "na")))}</section>` : ""}</div><section><h3>Wie viele Personen arbeiten im Mittel an welchen Tätigkeiten?</h3><p>Lies zum Beispiel die Spalte «Ø Vormittag». Arbeiten zwei Personen an einem vierstündigen Vormittag je zwei Stunden allein, ergibt das zusammen eine Person im Mittel. So kannst du abschätzen, wie viel Arbeitszeit auf diese Tätigkeit entfällt.</p><div class="ad-scroll"><table><thead><tr><th scope="col">Tätigkeit</th><th scope="col">Ø Vormittag</th><th scope="col">Ø Nachmittag</th><th scope="col">Ø je Halbtag</th></tr></thead><tbody>${r.activities.map((row) => `<tr><th scope="row">${esc(row.name)}</th><td>${esc(numberLabel(row.morning))}</td><td>${esc(numberLabel(row.afternoon))}</td><td>${esc(numberLabel(row.average))}</td></tr>`).join("")}</tbody></table></div></section><section><h3>Dokumentierte Abwesenheiten</h3><p>${r.absences.map((x) => `${esc(x.name)}: ${round(x.minutes / 60)} h`).join(" · ")}. Hier zählen alle eingetragenen Abwesenheiten der ausgewählten Personen an den ausgewerteten Halbtagen. Die Balken zur Arbeitszeit enthalten nur geleistete Arbeit.</p></section>`;
    else if (state.tab === "cross") body = cross(r, atSite);
    else if (state.tab === "trend") {
      const max = Math.max(1, ...r.timeline.map((o) => o.n || 0));
      body = `<section><h3>Entwicklung über die Erhebungswochen</h3><p>Jeder Balken zeigt den Durchschnitt einer Woche. Lies auch die Anzahl Halbtage und den Anteil erfasster Zeit. Fehlen in einer Woche viele Einträge, kann ihr Balken allein deshalb kürzer sein.</p>${bars(
        r.weeks.map((w) => ({
          name:
            "Woche ab " +
            dateLabel(w.start) +
            " · " +
            w.days +
            " Halbtage · " +
            percent(w.coverage) +
            " dokumentiert",
          average: w.n,
        })),
        "average",
        max,
      )}</section><section><h3>Einzelne Vor- und Nachmittage</h3><p>Jeder Punkt zeigt einen konkreten Halbtag auf derselben Skala (0–${round(max)} Personen). So erkennst du, ob hohe Werte wiederholt auftreten. Lücken werden nicht als null dargestellt.</p><div class="ad-observations">${r.timeline.map((o) => `<div class="ad-observation"><span>${dateLabel(o.d)} ${o.h ? "Nachmittag" : "Vormittag"}</span><div class="ad-dot-track">${o.n == null ? "<span>Keine Auswertung</span>" : `<i style="left:${(100 * o.n) / max}%" title="${esc(numberLabel(o.n))} Personen im Mittel"></i>`}</div><strong>${esc(numberLabel(o.n))}</strong><small>${percent(o.coverage)} dokumentiert</small></div>`).join("")}</div></section>`;
    } else
      body = `<section><div class="ad-toolbar">${select("split", "Was möchtest du unterscheiden?", fields, state.split)}${select("second", "Weiter aufteilen nach", [["", "Keine zweite Aufteilung"], ...fields.filter(([f]) => f !== state.split)], state.second)}${select(
        "metric",
        "Werte im Wochenprofil",
        [
          ["mean", "Durchschnitt"],
          ["peak", "Höchster erfasster Halbtag"],
        ],
        state.metric,
      )}</div>${matrix(r, reference)}${detailPanel()}${state.tab === "custom" ? `${stacked(r)}<h3>Zeitanteile der Kombinationen</h3>${shareControl}<p>${esc(basisText())}.</p>${bars(r.rows)}` : ""}</section>`;
    const noResults =
      r.selectedMinutes === 0
        ? `<div class="ad-notice" role="status"><strong>Keine passenden Tätigkeiten in dieser Auswahl.</strong><p>${state.location !== "UEBLICHER_ARBEITSPLATZ" && state.filters.room?.length ? "Genutzte Plätze werden nur am untersuchten Standort erfasst. Entferne den Platzfilter oder ändere den Arbeitsort." : !r.valid ? "Für die betrachteten Halbtage liegen keine auswertbaren Angaben vor. Prüfe auch die gewählte Mindestvollständigkeit." : "Die gewählten Filter haben keine gemeinsamen Treffer. Entferne einzelne Filter oder setze die Merkmalsfilter zurück."}</p>${state.filters.room?.length ? '<button type="button" data-clear="room">Platzfilter entfernen</button>' : ""}${button("clear", "Alle Merkmalsfilter zurücksetzen")}</div>`
        : "";
    root.innerHTML = `<div class="ad-shell"><header class="ad-heading"><div><p class="ad-eyebrow">TÄTIGKEITEN & ARBEITSUMGEBUNG</p><h2>${esc(data.gruppen_namen.join(" · "))}</h2><p>${dateLabel(data.zeitraum_von)} bis ${dateLabel(data.zeitraum_bis)}</p></div><div class="ad-actions">${onExport ? button("export", "Interaktiven Bericht exportieren") : ""}${button("csv", "Aktuelle Tabelle als CSV")}${button("print", "Drucken / PDF")}</div></header>
    <h3 class="ad-print-title">${esc(TABS.find(([key]) => key === state.tab)?.[1] || "Überblick")}${PRESETS[state.preset] ? " · " + esc(PRESETS[state.preset].name) : ""}</h3><p class="ad-status"><strong>${r.mode === "all" ? "Zwischenstand · alle bisher gespeicherten Eingaben" : "Nur eingereichte Eingaben"}</strong><span>Stand: ${esc(snapshot)} (Zürich)</span></p>
    <div class="ad-toolbar ad-controls">${
      data.includes_drafts !== false
        ? select(
            "mode",
            "Welche Eingaben berücksichtigen?",
            [
              ["all", "Alle bisher gespeicherten Eingaben"],
              ["submitted", "Nur eingereichte Eingaben"],
            ],
            r.mode,
          )
        : "<p>Dieser Bericht enthält nur eingereichte Eingaben.</p>"
    }${select(
      "location",
      "Arbeitsort",
      [
        ["UEBLICHER_ARBEITSPLATZ", "Am untersuchten Standort"],
        ["", "Alle Arbeitsorte"],
        ["HOMEOFFICE", "Homeoffice"],
        ["ANDERER_VD_STANDORT", "Anderer VD-Standort"],
        ["MOBIL_EXTERN", "Anderswo / unterwegs"],
      ],
      state.location,
    )}<button type="button" data-toggle="filters" aria-expanded="${panels.has("filters")}" aria-controls="ad-filters">Filter${active.length ? " (" + active.length + ")" : ""}</button><button type="button" data-toggle="basis" aria-expanded="${panels.has("basis")}" aria-controls="ad-basis">Auswertung anpassen</button>
    ${reference ? button("show-comparison", "Zum Vergleich") : button("pin", "Auswahl zum Vergleich festhalten")}</div>
    <div id="ad-filters" class="ad-disclosure-body" ${panels.has("filters") ? "" : "hidden"}><h3>Personen und Tätigkeiten auswählen</h3><p>Wählst du zwei Organisationseinheiten, siehst du beide zusammen. Wählst du zusätzlich «Allein arbeiten», siehst du diese Tätigkeit für beide Einheiten. Lässt du einen ganzen Filter leer, zählen alle seine Werte. Graue Werte passen nicht zur aktuellen Auswahl.</p><div class="ad-filter-grid">${filters}</div>${button("clear", "Alle Merkmalsfilter zurücksetzen")}</div>
    <div id="ad-basis" class="ad-disclosure-body" ${panels.has("basis") ? "" : "hidden"}><h3>Betrachtete Tageszeiten</h3><p>Normalerweise vergleichen wir die Zeit von 08:00 bis 12:00 und von 13:00 bis 17:00. Du kannst die Vorgabe übernehmen. Beginnt die Arbeit an deinem Standort früher, kannst du den Vormittag zum Beispiel um 07:00 starten lassen.</p><div class="ad-window-grid">${state.windows.map((w, h) => w.map((v, j) => `<label>${h ? "Nachmittag" : "Vormittag"} ${j ? "bis" : "von"}<input id="ad-window-${h}-${j}" type="time" min="07:00" max="19:00" step="900" data-window="${h},${j}" value="${clock(v)}"></label>`).join("")).join("")}</div>${button("reset-windows", "Standardzeiten verwenden")}<p>Wir teilen die eingetragenen Arbeitsstunden durch die Länge des Vor- oder Nachmittags. Verlängerst du den Vormittag, verteilen sich dieselben Arbeitsstunden auf mehr Zeit. Beim Durchschnitt über mehrere Halbtage zählt jeder Halbtag gleich viel.</p><p><strong>${round(r.outside / 60)} erfasste Tätigkeitsstunden der Auswahl liegen ausserhalb dieser Zeiten.</strong></p><div class="ad-toolbar">${select(
      "minCoverage",
      "Welche Halbtage sollen mitzählen?",
      [
        ["0", "Alle Halbtage mit mindestens einem Eintrag"],
        ["85", "Mindestens 85 % dokumentierter Zeit"],
        ["95", "Mindestens 95 % dokumentierter Zeit"],
        ["100", "Nur vollständig erfasste Halbtage"],
      ],
      state.minCoverage,
    )}</div><p>${r.qualityExcluded} Halbtage mit Einträgen fallen durch diese Auswahl weg. Die Prozentangabe zur Vollständigkeit bezieht sich weiterhin auf den ganzen bisherigen Zeitraum.</p><label class="ad-check"><input id="ad-ongoing" type="checkbox" data-ongoing ${state.includeOngoing ? "checked" : ""}>Laufenden Halbtag vorläufig einbeziehen</label><p>Bei laufenden Halbtagen zählen nur Einträge bis zum Berichtszeitpunkt. Der Durchschnitt bezieht sich trotzdem auf das ganze Zeitfenster; noch nicht verstrichene Zeit bleibt offen.</p></div>
    <div class="ad-chips" aria-label="Aktive Merkmalsfilter">${active.join("")}</div><p class="ad-context">Betrachtete Tageszeiten: ${esc(timeText)}${Number(state.minCoverage) ? ` · Nur Halbtage mit mindestens ${round(state.minCoverage)} % dokumentierter Zeit (${r.qualityExcluded} ausgeschlossen)` : ""} <span class="ad-screen-only"> · <button type="button" data-toggle="basis">Ändern</button></span></p><p class="ad-context">${esc(filterSummary(state))} · ${r.people} berücksichtigte Personen · ${percent(r.coverage)} der betrachteten Zeit dokumentiert</p>
    ${r.legacyEntries ? `<p class="ad-notice">${r.legacyEntries} historische Einträge werden separat in der historischen Auswertung ausgewertet. ${r.excludedPeople} Personen mit ausschliesslich historischer Erfassung sind hier ausgeschlossen.</p>` : ""}${noResults}
    <div class="ad-question-tools ad-controls"><label>Mit einer Fragestellung einsteigen<select data-preset id="ad-preset"><option value="">Fragestellung auswählen …</option>${PRESETS.map((p, i) => `<option value="${i}" ${state.preset === i ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
    <button type="button" id="ad-toggle-views" data-toggle="views" aria-expanded="${panels.has("views")}" aria-controls="ad-views">Eigene Ansichten</button>
    <button type="button" id="ad-reset" data-action="reset-view">Ansicht zurücksetzen</button></div>
    <div id="ad-views" class="ad-disclosure-body" ${panels.has("views") ? "" : "hidden"}><div class="ad-save"><input data-view-name aria-label="Name der Ansicht" placeholder="Name für diese Ansicht" maxlength="80">${button("save", "Ansicht speichern")}${views.length ? `<select data-view aria-label="Gespeicherte Ansicht"><option value="">Gespeicherte Ansicht öffnen</option>${views.map((v, i) => `<option value="${i}" ${String(i) === currentView ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>${button("delete-view", "Gespeicherte Ansicht löschen")}` : ""}</div><p>Gespeicherte Ansichten stehen in diesem Browser für diese Erhebung zur Verfügung.</p></div>
    ${message ? `<p role="status" class="ad-notice ad-screen-only">${esc(message)}</p>` : ""}<nav class="ad-tabs" aria-label="Auswertungsansichten">${TABS.map(
      ([v, l]) =>
        `<button type="button" data-tab="${v}" aria-pressed="${state.tab === v}">${l}</button>`,
    ).join(
      "",
    )}</nav>${body}${comparison(r, reference, ["overview", "custom"].includes(state.tab) ? "" : shareControl)}

    ${atSite ? `<section><h3>Geschätzte Zahl gleichzeitig laufender Besprechungen am Standort</h3><p>Mehrere Personen können dieselbe Sitzung eintragen. Wir fassen passende Einträge zusammen und schätzen so, wie viele Sitzungen im Durchschnitt während eines Halbtags liefen.</p><div class="ad-estimate"><strong>Ø ${esc(numberLabel(r.meetings.mean))}</strong><span>Höchster erfasster Halbtag: ${esc(numberLabel(r.meetings.peak?.n))}${r.meetings.peak ? " · " + dateLabel(r.meetings.peak.d) + (r.meetings.peak.h ? " Nachmittag" : " Vormittag") + " · " + percent(r.meetings.peak.coverage) + " der Zeit dokumentiert" : ""}</span></div><details data-panel="method"><summary>So wird die Besprechungszahl geschätzt</summary><p>Überlappende Meldungen mit gleicher Gruppengrösse, Raumnutzung, Online-Zuschaltung und gleichem Personenkreis werden zusammengefasst. Vier Meldungen einer internen Gruppe mit 2–4 Personen gelten beispielsweise ungefähr als eine gemeinsame Besprechung. Die Zahl wird über das Zeitfenster gemittelt.</p><p>Gleichzeitige Sitzungen mit ähnlichen Angaben können dabei zusammenfallen. Bei Sitzungen mit Gästen zählt jeder Eintrag als mögliche Sitzung, weil die Zahl der teilnehmenden Mitarbeitenden offen ist. Wenn du eine einzelne Gruppe auswählst, erhält sie ihren Anteil an gemeinsamen Sitzungen.</p></details></section>` : ""}
    <div class="ad-stats"><div><span>Berücksichtigte Personen</span><strong>${r.people}</strong><small>${r.submitted} eingereicht · ${r.drafts} noch nicht eingereicht · ${r.notStarted} ohne aktuelle Eingaben</small></div><div><span>Vollständigkeit der Angaben</span><strong>${percent(r.coverage)}</strong><small>der betrachteten Zeit dokumentiert · ${round(r.unknownMinutes / 60)} h ohne Angaben</small></div><div><span>Erfasste Arbeitszeit in der Auswahl</span><strong>${round(r.selectedMinutes / 60)} h</strong><small>${r.matchedPeople} unterschiedliche Personen mit passenden Tätigkeiten · ${r.valid} von ${r.expected} bisherigen Halbtagen ausgewertet</small></div></div>
    ${readingGuide(r)}
    <footer>Grobe Orientierung für die Raumgestaltung. ${onExport ? "Im HTML-Bericht können Empfänger die Filter selbst ändern. Die Datei enthält die Einträge der gewählten Datenbasis ohne Namen und E-Mail-Adressen." : ""}</footer></div>`;
    for (const p of openDetails)
      root
        .querySelector(`details[data-panel="${p}"]`)
        ?.setAttribute("open", "");
    for (const [field, offset] of filterScroll) {
      const list = root.querySelector(`[data-field="${field}"] .ad-options`);
      if (list && offset) list.scrollTop = offset;
    }
    if (focusId) {
      const el = root.querySelector("#" + focusId);
      el?.focus({ preventScroll: true });
      if (
        el &&
        typeof caret === "number" &&
        ["text", "search"].includes(el.type)
      )
        el.setSelectionRange(caret, caret);
    }
    onState?.(copy(state));
  }
  function download(content, type, name) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveViews() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(views));
    } catch {
      message =
        "Ansicht nur für diese Sitzung gespeichert; lokaler Speicher ist nicht verfügbar.";
    }
  }
  function change(event) {
    const el = event.target;
    if (el.hasAttribute("data-ongoing")) state.includeOngoing = el.checked;
    if (el.dataset.setting) {
      if (
        ["split", "second", "location", "crossBy"].includes(el.dataset.setting)
      )
        delete state.preset;
      message = "";
      state[el.dataset.setting] = el.value;
      if (el.dataset.setting === "split" && state.second === state.split)
        state.second = "";
    }
    if (el.dataset.filter) {
      delete state.preset;
      message = "";
      const f = el.dataset.filter,
        vs = new Set(state.filters[f] || []);
      if (el.checked) vs.add(el.value);
      else vs.delete(el.value);
      state.filters[f] = [...vs];
    }
    if (el.dataset.window) {
      const [h, j] = el.dataset.window.split(",").map(Number),
        [hh, mm] = el.value.split(":").map(Number),
        windows = copy(state.windows);
      windows[h][j] = hh * 60 + mm;
      if (!validateWindows(windows)) {
        el.value = clock(state.windows[h][j]);
        el.setCustomValidity(
          "Wähle zwei nicht überlappende Zeitfenster zwischen 07:00 und 19:00, die jeweils mindestens eine Stunde dauern.",
        );
        el.reportValidity();
        return;
      }
      el.setCustomValidity("");
      state.windows = windows;
    }
    if (el.hasAttribute("data-preset") && el.value !== "") {
      const p = PRESETS[Number(el.value)];
      currentView = "";
      state = {
        ...state,
        ...copy(p),
        preset: Number(el.value),
        filters: copy(p.filters || {}),
      };
      message = "Vorbereitete Ansicht geöffnet: " + p.name;
    }
    if (el.hasAttribute("data-view") && el.value !== "") {
      currentView = el.value;
      state = {
        ...copy(DEFAULTS),
        mode: data.default_mode || DEFAULTS.mode,
        ...copy(views[Number(el.value)].state),
      };
      if (state.filters.ao?.length) {
        state.location =
          state.filters.ao.length === 1 ? state.filters.ao[0] : "";
        if (state.filters.ao.length === 1) delete state.filters.ao;
      }
      message = "Gespeicherte Ansicht geöffnet.";
    }
    detail = null;
    render();
  }
  function input(event) {
    if (event.target.dataset.search) {
      searches[event.target.dataset.search] = event.target.value;
      render();
    }
  }
  function click(event) {
    const el = event.target.closest("button");
    if (!el) return;
    const r = () => calculateDashboard(data, state);
    if (el.dataset.toggle) {
      const p = el.dataset.toggle;
      if (panels.has(p)) panels.delete(p);
      else panels.add(p);
      render();
      root
        .querySelector(`[data-toggle="${p}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    if (
      el.dataset.clear ||
      el.dataset.all ||
      el.dataset.remove ||
      el.dataset.tab ||
      el.dataset.action === "clear" ||
      el.dataset.action === "use-site"
    )
      delete state.preset;
    if (el.dataset.tab) {
      state.tab = el.dataset.tab;
      message = "";
    }
    if (el.dataset.clear) delete state.filters[el.dataset.clear];
    if (el.dataset.all) {
      const f = el.dataset.all,
        result = r();
      state.filters[f] = result.options[f].filter(
        (v) =>
          result.optionCounts[f][v] > 0 &&
          displayValue(f, v)
            .toLocaleLowerCase()
            .includes((searches[f] || "").toLocaleLowerCase()),
      );
    }
    if (el.dataset.remove)
      state.filters[el.dataset.remove] = (
        state.filters[el.dataset.remove] || []
      ).filter((v) => v !== el.dataset.value);
    if (el.dataset.action === "show-comparison") {
      root.querySelector("#ad-comparison")?.focus();
      return;
    }
    if (el.dataset.action === "close-detail") {
      const trigger = detail?.trigger;
      detail = null;
      render();
      if (trigger) root.querySelector("#" + trigger)?.focus();
      return;
    }
    if (el.dataset.cell || el.dataset.action === "peak-days") {
      const result = r();
      let cell = el.dataset.cell;
      if (!cell) {
        const peak = result.totals.peak;
        if (!peak) return;
        state.tab = "week";
        delete state.preset;
        cell = "total," + (peak.wd * 2 + peak.h);
      }
      const [source, column] = cell.split(",");
      const i = Number(column);
      const row = source === "total" ? null : result.rows[Number(source)];
      const c = row ? row.cells[i] : result.coverageCells[i];
      const weekDay = Math.floor(i / 2),
        half = i % 2;
      detail = {
        trigger: row ? `ad-cell-${source}-${i}` : `ad-total-${i}`,
        title: `${row?.name || "Gesamte Auswahl"} · ${DAYS[weekDay]} ${half ? "Nachmittag" : "Vormittag"}`,
        text:
          `${c.days} von ${c.expectedDays} bisherigen Halbtagen ausgewertet. ${percent(c.coverage)} der Zeit dokumentiert.` +
          (row && c.heads != null
            ? ` Im Mittel ${numberLabel(c.heads)} unterschiedliche beteiligte Personen je ausgewertetem Halbtag.`
            : "") +
          (c.date
            ? ` Höchster Halbtag: ${dateLabel(c.date)} · ${percent(c.peakCoverage)} der Zeit dokumentiert.`
            : ""),
        dates: (row ? row.timeline : result.timeline).filter(
          (o) => o.wd === weekDay && o.h === half,
        ),
      };
      render();
      root.querySelector(".ad-detail")?.focus();
      return;
    }
    if (el.dataset.coverage !== undefined) {
      const i = Number(el.dataset.coverage),
        c = r().coverageCells[i];
      detail = {
        trigger: `ad-coverage-${i}`,
        title: `Vollständigkeit · ${DAYS[Math.floor(i / 2)]} ${i % 2 ? "Nachmittag" : "Vormittag"}`,
        text: `${percent(c.coverage)} der Zeit dokumentiert; ${round(c.unknown / 60)} h ohne Angaben. ${c.days} von ${c.expectedDays} bisherigen Halbtagen ausgewertet. ${c.future} noch nicht begonnen; ${c.ongoing} laufend.`,
      };
      render();
      root.querySelector(".ad-detail")?.scrollIntoView({ block: "nearest" });
      return;
    }
    const action = el.dataset.action;
    if (action === "reset-view") {
      state = startView();
      detail = null;
      currentView = "";
      panels.clear();
      for (const field of Object.keys(searches)) delete searches[field];
      for (const panel of root.querySelectorAll("details[open]"))
        panel.open = false;
      message =
        "Der Überblick zeigt wieder alle Personen am untersuchten Standort.";
      render();
      root.querySelector("#ad-reset").focus({ preventScroll: true });
      return;
    }
    if (action === "use-site") state.location = "UEBLICHER_ARBEITSPLATZ";
    if (action === "clear") state.filters = {};
    if (action === "reset-windows") state.windows = copy(DEFAULTS.windows);
    if (action === "pin") {
      state.comparison = {
        location: state.location,
        filters: copy(state.filters),
      };
      message =
        "Auswahl festgehalten. Ändere jetzt die Filter oder den Arbeitsort für den Vergleich.";
    }
    if (action === "unpin") {
      state.comparison = null;
      message = "";
    }
    if (action === "print") {
      window.print();
      return;
    }
    if (action === "export" && onExport) {
      onExport({
        ...copy(state),
        ...(detail ? { detailTrigger: detail.trigger } : {}),
      });
      return;
    }
    if (action === "save") {
      const name = root.querySelector("[data-view-name]").value.trim();
      if (!name) {
        message = "Gib einen Namen für die Ansicht ein.";
      } else {
        views = views.filter((v) => v.name !== name);
        views.push({ name, state: copy(state) });
        currentView = String(views.length - 1);
        message = "Ansicht gespeichert: " + name;
        saveViews();
      }
    }
    if (action === "delete-view") {
      const selected = root.querySelector("[data-view]")?.value;
      if (!selected) {
        message = "Wähle zuerst eine gespeicherte Ansicht.";
      } else {
        views.splice(Number(selected), 1);
        currentView = "";
        message = "Gespeicherte Ansicht gelöscht.";
        saveViews();
      }
    }
    if (action === "csv") {
      exportCsv(r());
      return;
    }
    detail = null;
    render();
  }
  function exportCsv(r) {
    const rows = [
      ["Auswertung", ...data.gruppen_namen],
      ["Ansicht", TABS.find(([key]) => key === state.tab)?.[1]],
      ...(PRESETS[state.preset]
        ? [["Fragestellung", PRESETS[state.preset].name]]
        : []),
      ["Personen in der Auswahl", r.people],
      ["Personen mit passenden Tätigkeiten", r.matchedPeople],
      [
        "Erfasste Arbeitszeit in der Auswahl (h)",
        Math.round(r.selectedMinutes / 60),
      ],
      ["Zeitraum", data.zeitraum_von, data.zeitraum_bis],
      ["Berichtsstand (Zürich)", data.snapshot_at || "Zeitpunkt des Abrufs"],
      [
        "Eingaben",
        r.mode === "all"
          ? "Alle bisher gespeicherten Eingaben"
          : "Nur eingereichte Eingaben",
      ],
      ["Auswahl", filterSummary(state)],
      [
        "Betrachtete Tageszeiten",
        state.windows.map((w) => w.map(clock).join("–")).join(" / "),
      ],
      ...(state.tab === "cross"
        ? [
            [
              "Prozentbasis Kreuztabelle",
              state.crossBy === "room" ? "Zeit je Platz" : "Zeit je Tätigkeit",
            ],
          ]
        : []),
      ...(["overview", "custom"].includes(state.tab) || state.comparison
        ? [["Prozentbasis Zeitanteile", basisText()]]
        : []),
      ["Mindestvollständigkeit %", state.minCoverage],
      [
        "Wegen Mindestvollständigkeit ausgeschlossene Halbtage",
        r.qualityExcluded,
      ],
      ["Laufenden Halbtag einbeziehen", state.includeOngoing ? "Ja" : "Nein"],
      [
        "Vollständigkeit der Angaben %",
        r.coverage == null ? "" : Math.round(r.coverage),
      ],
      ["Zeit ohne Angaben h", Math.round(r.unknownMinutes / 60)],
      ["Ausgewertete / bisherige Halbtage", r.valid, r.expected],
      [
        "Erfasste Tätigkeitsstunden ausserhalb der Tageszeiten",
        Math.round(r.outside / 60),
      ],
    ];
    const num = (n) => (n == null ? "" : Math.round(n));
    const persons = (n) => (n > 0 && n < 0.5 ? "<1" : num(n));
    if (state.tab === "trend")
      rows.push(
        [
          "Woche ab",
          "Personen im Mittel",
          "Ausgewertete Halbtage",
          "Dokumentierte Zeit %",
        ],
        ...r.weeks.map((w) => [w.start, persons(w.n), w.days, num(w.coverage)]),
        [],
        [
          "Datum",
          "Halbtag",
          "Personen im Mittel",
          "Dokumentierte Zeit %",
          "Ausgewertet",
        ],
        ...r.timeline.map((o) => [
          o.d,
          o.h ? "Nachmittag" : "Vormittag",
          persons(o.n),
          num(o.coverage),
          o.n == null ? "Nein" : "Ja",
        ]),
      );
    else if (state.tab === "cross") {
      const table = crossTable(r.cross, state.crossBy);
      rows.push([
        FIELDS[table.rowField],
        FIELDS[table.colField],
        "Stunden",
        state.crossBy === "room"
          ? "Anteil innerhalb Platz %"
          : "Anteil innerhalb Tätigkeit %",
      ]);
      if (!state.location || state.location === "UEBLICHER_ARBEITSPLATZ") {
        for (const row of table.rows) {
          for (const c of table.columns) {
            const minutes = row.cells.get(c) || 0;
            rows.push([
              displayValue(table.rowField, row.key),
              displayValue(table.colField, c),
              num(minutes / 60),
              num((100 * minutes) / row.minutes),
            ]);
          }
        }
      }
    } else if (state.tab === "overview")
      rows.push(
        [
          "Tätigkeit",
          "Zeitanteil %",
          "Ø Personen Vormittag",
          "Ø Personen Nachmittag",
          "Ø Personen je Halbtag",
        ],
        ...r.activities.map((x) => [
          x.name,
          num(x.share),
          persons(x.morning),
          persons(x.afternoon),
          persons(x.average),
        ]),
        [],
        ...(!state.location || state.location === "UEBLICHER_ARBEITSPLATZ"
          ? [
              ["Genutzter Platz am Standort", "Zeitanteil %"],
              ...r.places
                .filter((row) => JSON.parse(row.key)[0] !== "na")
                .map((row) => [row.name, num(row.share)]),
            ]
          : []),
        ...(r.totals.peak?.n > 0
          ? [
              [
                "Höchster erfasster Halbtag",
                "Datum",
                "Halbtag",
                "Personen im Mittel",
                "Dokumentierte Zeit %",
              ],
              [
                "Gesamte Auswahl",
                r.totals.peak.d,
                r.totals.peak.h ? "Nachmittag" : "Vormittag",
                persons(r.totals.peak.n),
                num(r.totals.peak.coverage),
              ],
            ]
          : []),
      );
    else
      rows.push(
        [
          "Wochenwerte",
          state.metric === "peak"
            ? "Höchster erfasster Halbtag"
            : "Durchschnitt",
        ],
        [
          "Kombination",
          "Zeitanteil %",
          "Ø Personen je Halbtag",
          ...DAYS.flatMap((d) => [d + " Vormittag", d + " Nachmittag"]),
        ],
        ...r.rows.map((x) => [
          x.name,
          num(x.share),
          persons(x.average),
          ...x.cells.map((c) =>
            persons(c[state.metric === "peak" ? "max" : "mean"]),
          ),
        ]),
        [
          "Gesamte Auswahl",
          "",
          persons(r.totals.average),
          ...r.totals.cells.map((c) =>
            persons(c[state.metric === "peak" ? "max" : "mean"]),
          ),
        ],
        [
          "Vollständigkeit der Angaben %",
          "",
          "",
          ...r.coverageCells.map((c) => num(c.coverage)),
        ],
        [
          "Ausgewertete / bisherige Halbtage",
          "",
          "",
          ...r.coverageCells.map((c) => `${c.days} / ${c.expectedDays}`),
        ],
        ...(state.metric === "peak"
          ? r.rows.flatMap((x) => [
              [
                x.name + " – Datum des höchsten Halbtags",
                "",
                "",
                ...x.cells.map((c) => c.date || ""),
              ],
              [
                x.name + " – Dokumentierte Zeit am höchsten Halbtag %",
                "",
                "",
                ...x.cells.map((c) => num(c.peakCoverage)),
              ],
            ])
          : []),
      );
    if (state.tab === "overview") {
      rows.push(
        [],
        ["Abwesenheit", "Stunden"],
        ...r.absences.map((a) => [a.name, num(a.minutes / 60)]),
      );
    }
    if (state.tab === "custom" && state.second) {
      const totals = new Map();
      for (const row of r.rows) {
        const [group] = JSON.parse(row.key);
        totals.set(group, (totals.get(group) || 0) + row.minutes);
      }
      rows.push(
        [],
        ["Verteilung innerhalb der Gruppen"],
        [
          allFields[state.split],
          allFields[state.second],
          "Stunden",
          "Zeitanteil innerhalb Gruppe %",
        ],
      );
      for (const row of r.rows) {
        const [group, part] = JSON.parse(row.key);
        const total = totals.get(group);
        rows.push([
          displayValue(state.split, group),
          displayValue(state.second, part),
          num(row.minutes / 60),
          total ? num((100 * row.minutes) / total) : "",
        ]);
      }
    }
    if (detail) {
      rows.push(
        [],
        ["Geöffnete Einzelansicht", detail.title],
        ["Erläuterung", detail.text],
      );
      if (detail.dates)
        rows.push(
          ["Datum", "Personen im Mittel", "Dokumentierte Zeit %"],
          ...detail.dates.map((o) => [o.d, persons(o.n), num(o.coverage)]),
        );
    }
    if (!state.location || state.location === "UEBLICHER_ARBEITSPLATZ") {
      const peak = r.meetings.peak;
      rows.push(
        [],
        [
          "Geschätzte gleichzeitige Besprechungen",
          "Ø je Halbtag",
          "Höchster Halbtag",
          "Datum",
          "Tageshälfte",
        ],
        [
          "Am Standort",
          persons(r.meetings.mean),
          persons(peak?.n),
          peak?.d || "",
          peak ? (peak.h ? "Nachmittag" : "Vormittag") : "",
        ],
      );
    }
    if (state.comparison) {
      const c = calculateDashboard(data, {
        ...state,
        ...state.comparison,
        comparison: null,
      });
      const overlap = sharedSlots(r.eligible, c.eligible);
      const left = filterSummary(state),
        right = filterSummary(state.comparison);
      rows.push(
        [],
        ["Vergleichsauswahl", right],
        ["Vollständigkeit der Vergleichsangaben %", num(c.coverage)],
        ["Ausgewertete Vergleichshalbtage", c.valid],
        ["Gemeinsam ausgewertete Halbtage", overlap.common],
        [
          "Unterschiedliche Halbtage in den Auswahlen",
          overlap.different ? "Ja" : "Nein",
        ],
        [
          "Kombination",
          left + " Ø Personen",
          left + " Zeitanteil %",
          right + " Ø Personen",
          right + " Zeitanteil %",
          "Differenz in Prozentpunkten",
          "Hinweis zur Zeile",
        ],
        ...comparisonRows(r, c, state).map((row) => [
          row.name,
          persons(row.current.average),
          num(row.current.share),
          persons(row.reference.average),
          num(row.reference.share),
          num(row.delta),
          row.differentDays ? "Unterschiedliche Halbtage" : "",
        ]),
      );
    }
    const quote = (value) => {
      const cell =
        typeof value === "number"
          ? String(value)
          : String(value ?? "").replace(/^[=+@\\-\\t\\r]/, "'$&");
      return '"' + cell.replace(/"/g, '""') + '"';
    };
    download(
      "\uFEFF" + rows.map((row) => row.map(quote).join(";")).join("\r\n"),
      "text/csv;charset=utf-8",
      "taetigkeiten-auswertung.csv",
    );
  }
  root.addEventListener("change", change);
  root.addEventListener("input", input);
  root.addEventListener("click", click);
  render();
  if (
    initialDetail &&
    /^(?:ad-total-\d|ad-cell-\d+-\d|ad-coverage-\d)$/.test(initialDetail)
  ) {
    root.querySelector("#" + initialDetail)?.click();
  }
  return () => {
    root.removeEventListener("change", change);
    root.removeEventListener("input", input);
    root.removeEventListener("click", click);
    root.replaceChildren();
  };
}
