import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { setupStatus } from "./api/auth";

import NavBar from "./components/NavBar";
import { RequireAdmin, RequireAuth, RequireTeilnehmer } from "./components/RequireAuth";
import Spinner from "./components/Spinner";

import SetupPage         from "./pages/SetupPage";
import LoginPage         from "./pages/LoginPage";
import RegistrierungPage from "./pages/RegistrierungPage";
import GruppenAuswahlPage from "./pages/GruppenAuswahlPage";
import PinAendernPage    from "./pages/PinAendernPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import GruppenPage    from "./pages/admin/GruppenPage";
import TeilnehmerPage from "./pages/admin/TeilnehmerPage";
import KategorienPage from "./pages/admin/KategorienPage";
import RaumtypenPage  from "./pages/admin/RaumtypenPage";
import AuswertungPage from "./pages/admin/AuswertungPage";

import TnMain       from "./pages/teilnehmer/TnMain";
import HilfePageTn  from "./pages/teilnehmer/HilfePageTn";
import HilfePageAdmin from "./pages/admin/HilfePageAdmin";
import AdminsPage     from "./pages/admin/AdminsPage";

function Root() {
  const { user } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(null); // null=loading

  useEffect(() => {
    setupStatus().then(({ data }) => {
      setNeedsSetup(data ? !data.admin_exists : false);
    });
  }, []);

  if (needsSetup === null) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user === undefined) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rolle === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/tn/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <NavBar />
          <main className="flex-1">
            <Routes>
              <Route path="/"                  element={<Root />} />
              <Route path="/setup"             element={<SetupPage />} />
              <Route path="/login"             element={<LoginPage />} />
              <Route path="/registrierung/:token" element={<RegistrierungPage />} />
              <Route path="/pin-aendern"       element={<RequireAuth><PinAendernPage /></RequireAuth>} />
              <Route path="/gruppen-auswahl"   element={<Navigate to="/tn/dashboard" replace />} />

              {/* Admin */}
              <Route path="/admin/dashboard"   element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
              <Route path="/admin/gruppen"     element={<RequireAdmin><GruppenPage /></RequireAdmin>} />
              <Route path="/admin/gruppen/:gruppeId/teilnehmer" element={<RequireAdmin><TeilnehmerPage /></RequireAdmin>} />
              <Route path="/admin/kategorien"  element={<RequireAdmin><KategorienPage /></RequireAdmin>} />
              <Route path="/admin/raumtypen"   element={<RequireAdmin><RaumtypenPage /></RequireAdmin>} />
              <Route path="/admin/auswertung"  element={<RequireAdmin><AuswertungPage /></RequireAdmin>} />
              <Route path="/admin/admins"      element={<RequireAdmin><AdminsPage /></RequireAdmin>} />
              <Route path="/admin/hilfe"       element={<RequireAdmin><HilfePageAdmin /></RequireAdmin>} />

              {/* Teilnehmer */}
              <Route path="/tn/dashboard"      element={<RequireTeilnehmer><TnMain /></RequireTeilnehmer>} />
              <Route path="/tn/kalender"       element={<Navigate to="/tn/dashboard" replace />} />
              <Route path="/tn/hilfe"          element={<RequireTeilnehmer><HilfePageTn /></RequireTeilnehmer>} />

              <Route path="*"                  element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="bg-slate-50 border-t border-slate-200 text-xs text-slate-400 text-center py-3 px-4 shrink-0">
            HR Entwicklung &amp; Projekte · Volkswirtschaftsdirektion · {new Date().getFullYear()}
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
