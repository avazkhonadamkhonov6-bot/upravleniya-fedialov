"use client";

import { catalogLabel, isRestaurant, positionsFor, type BusinessType, type Client, type User } from "@filialhub/shared";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api";
import { clearApiCache } from "./use-api";
import { listenForErrors } from "./report-error";
import { registerSW } from "./push";

export interface RegisterInput {
  businessName: string;
  businessType: BusinessType;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterClientInput {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
}

/** Ки ворид шуд: корманд/шеф ё мизоҷи онлайн */
export type Account = { kind: "staff"; user: User } | { kind: "client"; client: Client };

type LoginResponse = { kind: "staff"; token: string; user: User } | { kind: "client"; token: string; client: Client };

/** Навъи токен дар браузер — то донем /auth/me ё /shop/me бихонем */
const KIND_KEY = "fh-kind";
function setKind(kind: "staff" | "client" | null) {
  try {
    if (kind) localStorage.setItem(KIND_KEY, kind);
    else localStorage.removeItem(KIND_KEY);
  } catch {}
}
function getKind() {
  try {
    return localStorage.getItem(KIND_KEY);
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  /** Мизоҷи онлайн (агар ворид шуда бошад) */
  client: Client | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Account>;
  /** Соҳибкори нав: ширкат + ҳисоби шеф */
  register: (data: RegisterInput) => Promise<User>;
  /** Мизоҷи нав */
  registerClient: (data: RegisterClientInput) => Promise<Client>;
  logout: () => void;
  setUser: (u: User) => void;
  setClient: (c: Client) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // AuthProvider дар ҳар саҳифа ҳаст — хатоҳои браузерро аз ҳамин ҷо ба сервер мефиристем
  useEffect(listenForErrors, []);
  // Service worker: огоҳӣ ба телефон ва насби сайт ҳамчун барнома
  useEffect(() => {
    void registerSW();
  }, []);

  useEffect(() => {
    const check = !getToken()
      ? Promise.resolve()
      : getKind() === "client"
        ? api<Client>("/shop/me").then(setClient)
        : api<User>("/auth/me").then(setUser);
    // 401 токенро дар api() тоза мекунад; хатои шабака ё сервер набояд корбарро аз система барорад.
    check.catch(() => {}).finally(() => setLoading(false));
  }, []);

  const accept = useCallback((res: LoginResponse): Account => {
    setToken(res.token);
    setKind(res.kind);
    if (res.kind === "client") {
      setUser(null);
      setClient(res.client);
      return { kind: "client", client: res.client };
    }
    setClient(null);
    setUser(res.user);
    return { kind: "staff", user: res.user };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => accept(await api<LoginResponse>("/auth/login", { method: "POST", json: { email, password } })),
    [accept],
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      const acc = accept(await api<LoginResponse>("/auth/register", { method: "POST", json: data }));
      if (acc.kind !== "staff") throw new Error("unexpected");
      return acc.user;
    },
    [accept],
  );

  const registerClient = useCallback(
    async (data: RegisterClientInput) => {
      const acc = accept(await api<LoginResponse>("/auth/register-client", { method: "POST", json: data }));
      if (acc.kind !== "client") throw new Error("unexpected");
      return acc.client;
    },
    [accept],
  );

  const router = useRouter();
  const logout = useCallback(() => {
    setToken(null);
    clearApiCache();
    setKind(null);
    setUser(null);
    setClient(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, client, loading, login, register, registerClient, logout, setUser, setClient }),
    [user, client, loading, login, register, registerClient, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Навъи кори ширкати корбар: вазифаҳои кормандон, «Меню» ё «Маҳсулот» */
export function useBusiness() {
  const { user } = useAuth();
  const type = user?.organization?.type;
  return {
    type,
    positions: positionsFor(type),
    restaurant: isRestaurant(type),
    catalog: catalogLabel(type),
  };
}
