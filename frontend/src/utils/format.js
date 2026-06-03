/**
 * Format an ISO date string (yyyy-mm-dd) or Date to dd.mm.yyyy.
 * Returns "–" for empty/null values.
 */
export function fmtDate(value) {
  if (!value) return "–";
  const s = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  const [y, m, d] = s.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}
