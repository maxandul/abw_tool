import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export function RequireAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rolle !== "ADMIN") return <Navigate to="/tn/dashboard" replace />;
  return children;
}

export function RequireTeilnehmer({ children }) {
  const { user, gruppeId } = useAuth();
  if (user === undefined) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rolle === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (!gruppeId) return <Navigate to="/gruppen-auswahl" replace />;
  return children;
}
