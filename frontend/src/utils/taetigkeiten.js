// ── Current structure (Arbeitsform-based) ──────────────────────────────────

export const ARBEITSFORM_ORDER = ["EINZELARBEIT", "MEETING", "ABWESENHEIT"];

export const ARBEITSFORM_LABELS = {
  EINZELARBEIT: "Einzelarbeit",
  MEETING: "Besprechung/Meeting",
  ABWESENHEIT: "Abwesenheit",
};

export const ARBEITSORT_OPTS = [
  { value: "UEBLICHER_ARBEITSPLATZ", label: "Üblicher Arbeitsplatz/Standort" },
  { value: "HOMEOFFICE", label: "Homeoffice" },
  { value: "ANDERER_VD_STANDORT", label: "Anderer VD-Standort" },
  { value: "MOBIL_EXTERN", label: "Mobil/extern" },
];

export const GRUPPENGROESSE_OPTS = [
  { value: "ZWEI_BIS_VIER", label: "2-4 Personen" },
  { value: "FUENF_BIS_ACHT", label: "5-8 Personen" },
  { value: "NEUN_BIS_ZWOELF", label: "9-12 Personen" },
  { value: "DREIZEHN_PLUS", label: "13+ Personen" },
];

export const TEILNEHMERKREIS_OPTS = [
  { value: "STANDORTINTERN", label: "Standortintern" },
  { value: "STANDORTUEBERGREIFEND_EXTERN", label: "Standortübergreifend/extern" },
];

export const RUECKZUGSBEDARF_OPTS = [
  { value: "ERFORDERLICH", label: "Rückzug erforderlich" },
  { value: "GEMEINSAM_MOEGLICH", label: "Gemeinsames Umfeld möglich" },
];

export const ABWESENHEIT_GRUND_OPTS = [
  { value: "TEILZEIT", label: "Teilzeit" },
  { value: "SONSTIGES", label: "Sonstiges (Ferien, Krankheit, Feiertag etc.)" },
];

export const showArbeitsort = (arbeitsform) => arbeitsform === "EINZELARBEIT";
export const showGruppengroesse = (arbeitsform) => arbeitsform === "MEETING";
export const showTeilnehmerkreis = (arbeitsform) => arbeitsform === "MEETING";
export const showRueckzugsbedarf = (arbeitsform) =>
  arbeitsform === "EINZELARBEIT" || arbeitsform === "MEETING";
export const showAbwesenheitGrund = (arbeitsform) => arbeitsform === "ABWESENHEIT";

/** Suggested hex colors per Arbeitsform (green / blue / gray). */
export const ARBEITSFORM_FARBEN = {
  EINZELARBEIT: ["#58D68D", "#2ECC71", "#27AE60", "#1E8449", "#145A32"],
  MEETING: ["#85C1E9", "#5DADE2", "#3498DB", "#2874A6", "#1A5276"],
  ABWESENHEIT: ["#D5D8DC", "#BDC3C7", "#95A5A6", "#7F8C8D", "#566573"],
};

export function defaultFarbeForArbeitsform(arbeitsform, index = 0) {
  return ARBEITSFORM_FARBEN[arbeitsform]?.[index] ?? "#4472C4";
}

export function formatTaetigkeitMeta(k) {
  if (!k) return "";
  if (!k.ist_legacy) {
    const parts = [];
    if (k.arbeitsort_label) parts.push(k.arbeitsort_label);
    if (k.gruppengroesse_label) parts.push(k.gruppengroesse_label);
    if (k.teilnehmerkreis_label) parts.push(k.teilnehmerkreis_label);
    if (k.rueckzugsbedarf_label) parts.push(k.rueckzugsbedarf_label);
    if (k.abwesenheit_grund_label) parts.push(k.abwesenheit_grund_label);
    return parts.join(" · ");
  }
  const parts = [];
  if (k.stoerung) parts.push(STOERUNG_OPTS.find(o => o.value === k.stoerung)?.label ?? k.stoerung);
  if (k.planung) parts.push(PLANUNG_OPTS.find(o => o.value === k.planung)?.label ?? k.planung);
  return parts.join(" · ");
}

/**
 * Group a (possibly mixed) list of Kategorien for display: current
 * (Arbeitsform-based) groups first in ARBEITSFORM_ORDER, followed by any
 * legacy (pre-restructure) groups in TAETIGKEITSGRUPPE_ORDER. Kategorien are
 * sorted by sort_order within each group.
 */
export function groupKategorien(items) {
  const byGroup = new Map();
  const addTo = (key, label, item) => {
    if (!byGroup.has(key)) byGroup.set(key, { key, label, items: [] });
    byGroup.get(key).items.push(item);
  };

  [...items]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((k) => {
      if (!k.ist_legacy) {
        addTo(k.arbeitsform, ARBEITSFORM_LABELS[k.arbeitsform] ?? k.arbeitsform, k);
      } else {
        addTo(
          k.taetigkeitsgruppe,
          TAETIGKEITSGRUPPE_LABELS[k.taetigkeitsgruppe] ?? k.taetigkeitsgruppe,
          k,
        );
      }
    });

  const order = [...ARBEITSFORM_ORDER, ...TAETIGKEITSGRUPPE_ORDER];
  return order
    .filter((key) => byGroup.has(key))
    .map((key) => byGroup.get(key));
}

// ── Legacy structure (pre-Arbeitsform restructure) ──────────────────────────
// Kept only so Kategorien from the first Erhebung keep displaying correctly
// (Admin-Archiv, "edit on behalf" dropdown, past Auswertungen). Never used
// for new Kategorien.

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
