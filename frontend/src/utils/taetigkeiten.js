export const TAETIGKEITSGRUPPE_ORDER = [
  "EINZELARBEIT",
  "ZU_ZWEIT_DREIT",
  "GRUPPE_4PLUS",
  "EXTERN",
];

export const TAETIGKEITSGRUPPE_LABELS = {
  EINZELARBEIT: "Einzelarbeit",
  ZU_ZWEIT_DREIT: "Zu zweit/zu dritt (physisch)",
  GRUPPE_4PLUS: "In Gruppen (4+, physisch)",
  EXTERN: "Extern",
};

export const STOERUNG_OPTS = [
  { value: "ERLAUBT", label: "Störung erlaubt" },
  { value: "UNGESTOERT", label: "Ungestört" },
];

export const PLANUNG_OPTS = [
  { value: "GEPLANT", label: "Geplant" },
  { value: "UNGEPLANT", label: "Ungeplant" },
];

export function sortTaetigkeiten(items) {
  return [...items].sort((a, b) => {
    const ga = TAETIGKEITSGRUPPE_ORDER.indexOf(a.taetigkeitsgruppe);
    const gb = TAETIGKEITSGRUPPE_ORDER.indexOf(b.taetigkeitsgruppe);
    if (ga !== gb) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb);
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export function groupByTaetigkeitsgruppe(items) {
  const sorted = sortTaetigkeiten(items);
  const groups = {};
  sorted.forEach(k => {
    const g = k.taetigkeitsgruppe || "EXTERN";
    if (!groups[g]) groups[g] = [];
    groups[g].push(k);
  });
  return TAETIGKEITSGRUPPE_ORDER
    .filter(g => groups[g]?.length)
    .map(g => ({
      key: g,
      label: TAETIGKEITSGRUPPE_LABELS[g] ?? g,
      items: groups[g],
    }));
}

export function formatTaetigkeitMeta(k) {
  if (!k) return "";
  const parts = [];
  if (k.stoerung) {
    parts.push(STOERUNG_OPTS.find(o => o.value === k.stoerung)?.label ?? k.stoerung);
  }
  if (k.planung) {
    parts.push(PLANUNG_OPTS.find(o => o.value === k.planung)?.label ?? k.planung);
  }
  return parts.join(" · ");
}

export function needsStoerung(gruppe) {
  return gruppe && gruppe !== "EXTERN";
}

/** Planung field shown in admin form (optional for Einzelarbeit). */
export function showPlanung(gruppe) {
  return gruppe === "EINZELARBEIT" || gruppe === "ZU_ZWEIT_DREIT" || gruppe === "GRUPPE_4PLUS";
}

/** Planung is mandatory (not for Einzelarbeit). */
export function planungRequired(gruppe) {
  return gruppe === "ZU_ZWEIT_DREIT" || gruppe === "GRUPPE_4PLUS";
}

/** Suggested hex colors per Tätigkeitsgruppe (green / blue / red / gray). */
export const GRUPPE_FARBEN = {
  EINZELARBEIT: ["#58D68D", "#2ECC71", "#27AE60", "#1E8449", "#145A32"],
  ZU_ZWEIT_DREIT: ["#85C1E9", "#5DADE2", "#3498DB", "#2874A6", "#1A5276"],
  GRUPPE_4PLUS: ["#F1948A", "#EC7063", "#E74C3C", "#C0392B", "#922B21"],
  EXTERN: ["#D5D8DC", "#BDC3C7", "#95A5A6", "#7F8C8D", "#566573"],
};

export function defaultFarbeForGruppe(gruppe, index = 0) {
  return GRUPPE_FARBEN[gruppe]?.[index] ?? "#4472C4";
}

/** @deprecated use showPlanung / planungRequired */
export function needsPlanung(gruppe) {
  return planungRequired(gruppe);
}
