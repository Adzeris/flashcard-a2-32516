import { useCallback, useEffect, useState } from "react";
import { authRequest, loginRequest, apiRequest } from "../api";

const TOKEN_KEY = "token";

// Owns auth state (token + current user) so views don't have to juggle
// localStorage and /me calls themselves.
export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  // Persist token whenever it changes; clear when logged out.
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // Whenever a token shows up, fetch the matching user. If the token is
  // stale/invalid the backend returns 401 and we wipe local state.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      return undefined;
    }
    setChecking(true);
    authRequest("/api/auth/me", token)
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((err) => {
        if (cancelled) return;
        setAuthError(err.message || "Session expired");
        setToken("");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (username, password) => {
    const payload = await loginRequest(username, password);
    setToken(payload.access_token);
  }, []);

  const register = useCallback(async (username, email, password) => {
    await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    await login(username, password);
  }, [login]);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
  }, []);

  // Local mutation so profile edits show up immediately without re-fetching.
  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await authRequest("/api/auth/me", token);
    setUser(me);
  }, [token]);

  return {
    token,
    user,
    authError,
    checking,
    login,
    register,
    logout,
    refreshUser,
    isAdmin: user?.role === "admin",
  };
}
