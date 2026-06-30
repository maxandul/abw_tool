import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout, meineGruppen } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const linkCls = ({ isActive }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
    }`;

  // Session expired or not logged in: show minimal bar with login button
  if (!user) return (
    <nav className="bg-brand-600 text-white shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-2">
        <span className="font-semibold text-white mr-4 shrink-0">Tätigkeitserhebung</span>
        <div className="ml-auto">
          <NavLink to="/login" className="btn-ghost text-white/80 hover:text-white text-sm border-white/30">Anmelden</NavLink>
        </div>
      </div>
    </nav>
  );

  const isAdmin = user.rolle === "ADMIN";

  return (
    <nav className="bg-brand-600 text-white shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-2">
        <span className="font-semibold text-white mr-4 shrink-0">Tätigkeitserhebung</span>

        {isAdmin ? (
          <>
            <NavLink to="/admin/dashboard" className={linkCls}>Dashboard</NavLink>
            <NavLink to="/admin/gruppen"   className={linkCls}>Erhebungen</NavLink>
            <NavLink to="/admin/kategorien" className={linkCls}>Tätigkeiten</NavLink>
            <NavLink to="/admin/auswertung" className={linkCls}>Auswertung</NavLink>
            <NavLink to="/admin/admins"     className={linkCls}>Admins</NavLink>
            <NavLink to="/admin/hilfe"      className={linkCls}>Hilfe</NavLink>
          </>
        ) : (
          <>
            {/* Dashboard = /tn/dashboard ohne tab-param */}
            <NavLink to="/tn/dashboard"
              className={() => {
                const active = !searchParams.get("tab");
                return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"}`;
              }}>
              Dashboard
            </NavLink>
            {/* One tab per Erhebung */}
            {meineGruppen.map(g => (
              <NavLink key={g.id}
                to={`/tn/dashboard?tab=${g.id}`}
                className={() => {
                  const active = searchParams.get("tab") === String(g.id);
                  return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"}`;
                }}>
                {g.name}
              </NavLink>
            ))}
            <NavLink to="/tn/hilfe" className={linkCls}>Hilfe</NavLink>
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-white/60">{user.email}</span>
          <button onClick={handleLogout} className="btn-ghost text-white/80 hover:text-white text-sm">
            Abmelden
          </button>
        </div>
      </div>
    </nav>
  );
}
