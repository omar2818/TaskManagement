import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/endpoints";
import { setUnauthorizedHandler } from "../api/client";
import type { LoginRequest, UserResponse } from "../api/types";
import { clearToken, getToken, setToken } from "./tokenStorage";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: UserResponse | null;
  status: AuthStatus;
  /** Shown on the login page, e.g. after the session expired. */
  sessionMessage: string | null;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? "loading" : "anonymous"));
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const endSession = useCallback(
    (message: string | null) => {
      clearToken();
      queryClient.clear(); // never leak one user's cached data to the next login
      setUser(null);
      setStatus("anonymous");
      setSessionMessage(message);
    },
    [queryClient],
  );

  // The API client reports every 401 here; ProtectedRoute then redirects to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession("Your session has expired. Please log in again."));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Restore the session after a page refresh while the token is still valid.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous"); // a 401 was already handled (token cleared + message set)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    const auth = await authApi.login(request);
    setToken(auth.accessToken, auth.expiresAtUtc);
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus("authenticated");
      setSessionMessage(null);
    } catch (error) {
      clearToken();
      throw error;
    }
  }, []);

  const logout = useCallback(() => endSession(null), [endSession]);

  const value = useMemo(
    () => ({ user, status, sessionMessage, login, logout }),
    [user, status, sessionMessage, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
