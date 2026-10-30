"use client";


import { tr } from "@/lib/i18n";
const TOKEN_KEY = "fh-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = getToken();
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`/api${path}`, {
        ...rest,
        headers: {
          ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : rest.body,
      });
    } catch {
      throw new ApiError(tr("Сервер дастрас нест. Санҷед, ки API кор мекунад."), 0);
    }
    // 429 бе JSON — аз прокси-и Render/Cloudflare, на аз API-и мо (он JSON бо матн медиҳад):
    // маҳдудияти кӯтоҳмуддат аст, пас аз таваққуф то 3 маротиба такрор мекунем
    const edge429 = res.status === 429 && !res.headers.get("content-type")?.includes("application/json");
    if (!edge429 || attempt >= 3) break;
    const wait = Math.min(Number(res.headers.get("retry-after")) || attempt + 1, 5);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }

  if (res.status === 401 && token) {
    setToken(null);
    // Пурра аз нав бор мекунем, то ҳолати кӯҳнаи саҳифа тоза шавад.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) location.href = "/login";
  }
  if (!res.ok) {
    let message = res.status === 429 ? tr("Дархостҳо аз ҳад зиёданд. Каме истед ва аз нав кӯшиш кунед.") : tr("Хатогӣ ({0})", res.status);
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.map((m: string) => tr(m)).join(", ") : body.message ? tr(body.message) : message;
    } catch {}
    if (res.status >= 500 && message.startsWith("Internal")) message = tr("Хатогии сервер. Базаи маълумотро санҷед.");
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  // NestJS барои `null` бадани холӣ мефиристад — онро ҳамчун null бармегардонем, на хато.
  const body = await res.text();
  return (body ? JSON.parse(body) : null) as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
}
