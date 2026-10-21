// Small, consistent line icons. Labels always carry the meaning.
export default function ActivityIcon({ type, className = "w-4 h-4" }) {
  const paths = {
    EINZELARBEIT: <><circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></>,
    ONLINE: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
    MEETING: <><circle cx="8" cy="7" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m1 3a5 5 0 0 1 5 5v3"/></>,
    ABWESENHEIT: <><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></>,
    HYBRID: <><rect x="10" y="3" width="12" height="9" rx="1"/><circle cx="5" cy="14" r="3"/><path d="M1 22v-1a4 4 0 0 1 8 0v1m7-10v4m-3 0h6"/></>,
  };
  if (!paths[type]) return null;
  return <svg className={`inline-block shrink-0 align-text-bottom ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[type]}</svg>;
}
