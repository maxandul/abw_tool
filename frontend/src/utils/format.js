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

/**
 * Count working days (Mon–Fri) between two ISO date strings (inclusive).
 */
export function workingDays(vonIso, bisIso) {
  if (!vonIso || !bisIso) return 0;
  const start = new Date(vonIso + "T00:00:00");
  const end   = new Date(bisIso + "T00:00:00");
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Format minutes as "Xh Ym" or just "Xh" if whole hours.
 */
export function fmtMinuten(min) {
  if (!min && min !== 0) return "–";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
