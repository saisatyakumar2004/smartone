import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from './services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we ask the server "who am I?"

  // On page load, ask the server whether the cookie is still valid.
  useEffect(() => {
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (form) => {
    const data = await authApi.login(form);
    setUser(data.user);
  };

  // useCallback keeps the same function between renders so effects that depend on it don't re-run.
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
