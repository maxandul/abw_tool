const MAP = {
  OFFEN:          { label: "Offen",           cls: "bg-slate-100 text-slate-600" },
  EINGEREICHT:    { label: "Eingereicht",     cls: "bg-blue-100 text-blue-700" },
  IN_BEARBEITUNG: { label: "In Bearbeitung",  cls: "bg-amber-100 text-amber-700" },
  ABGESCHLOSSEN:  { label: "Abgeschlossen",   cls: "bg-green-100 text-green-700" },
};

export default function StatusBadge({ status }) {
  const { label, cls } = MAP[status] ?? MAP.OFFEN;
  return <span className={`badge ${cls}`}>{label}</span>;
}
