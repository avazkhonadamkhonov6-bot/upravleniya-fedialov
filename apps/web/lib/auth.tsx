"use client";

import type { User } from "@filialhub/shared";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = getToken()
      ? api<User>("/auth/me")
          .then(setUser)
          // 401 токенро дар api() тоза мекунад; хатои шабака ё сервер набояд корбарро аз система барорад.
          .catch(() => {})
      : Promise.resolve();
    check.finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const router = useRouter();
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
