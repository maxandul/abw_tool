import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, gruppeId, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate("/login"); };

  if (!user) return null;
  const isAdmin = user.rolle === "ADMIN";

  const linkCls = ({ isActive }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
    }`;

  return (
    <nav className="bg-brand-600 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-2">
        <span className="font-semibold text-white mr-4 shrink-0">Tätigkeitserhebung</span>

        {isAdmin ? (
          <>
            <NavLink to="/admin/dashboard" className={linkCls}>Dashboard</NavLink>
            <NavLink to="/admin/gruppen"   className={linkCls}>Erhebungen</NavLink>
            <NavLink to="/admin/kategorien" className={linkCls}>Kategorien</NavLink>
            <NavLink to="/admin/raumtypen"  className={linkCls}>Raumtypen</NavLink>
            {gruppeId && <NavLink to="/admin/auswertung" className={linkCls}>Auswertung</NavLink>}
          </>
        ) : (
          <>
            <NavLink to="/tn/dashboard"  className={linkCls}>Übersicht</NavLink>
            <NavLink to="/tn/kalender"   className={linkCls}>Kalender</NavLink>
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
