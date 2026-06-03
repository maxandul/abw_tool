import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { me as fetchMe, logout as apiLogout } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(undefined); // undefined = loading
  const [gruppeId, setGruppeId] = useState(() => {
    const s = sessionStorage.getItem("gruppeId");
    return s ? parseInt(s) : null;
  });

  const refresh = useCallback(async () => {
    const { data } = await fetchMe();
    setUser(data?.user ?? null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const chooseGruppe = useCallback((id) => {
    setGruppeId(id);
    if (id) sessionStorage.setItem("gruppeId", id);
    else sessionStorage.removeItem("gruppeId");
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    chooseGruppe(null);
  }, [chooseGruppe]);

  return (
    <AuthContext.Provider value={{ user, setUser, gruppeId, chooseGruppe, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
