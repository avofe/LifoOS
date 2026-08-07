import { toast } from "sonner";

type FetchOpts = RequestInit & { silent?: boolean };

const ACCESS_KEY_STORAGE = "lifeos_access_key";

let authRequiredHandler: (() => void) | null = null;

export function setAuthRequiredHandler(fn: (() => void) | null) {
  authRequiredHandler = fn;
}

export function getAccessKey(): string {
  try {
    return localStorage.getItem(ACCESS_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setAccessKey(key: string) {
  try {
    if (key) localStorage.setItem(ACCESS_KEY_STORAGE, key);
    else localStorage.removeItem(ACCESS_KEY_STORAGE);
  } catch {
    /* noop */
  }
}

function shouldRetry(status: number): boolean {
  return status >= 500 || status === 429;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function apiFetch<T = any>(url: string, opts?: FetchOpts): Promise<T> {
  const { silent, ...init } = opts ?? {};
  const method = (init.method ?? "GET").toUpperCase();
  const maxRetries = method === "GET" ? 3 : 1;
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const initHeaders = new Headers(init.headers);
      const accessKey = getAccessKey();
      if (accessKey) initHeaders.set("x-api-key", accessKey);
      init.headers = initHeaders;

      const res = await fetch(url, init);

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return res.json();
      }

      const body = await res.json().catch(() => ({}));
      const detail = body.error ?? `Ошибка ${res.status}`;

      if (res.status === 401) {
        authRequiredHandler?.();
        if (!silent) toast.error(detail);
        throw new Error(detail);
      }

      if (attempt < maxRetries && shouldRetry(res.status)) {
        await sleep(delays[attempt]);
        continue;
      }

      if (!silent) toast.error(detail);
      throw new Error(detail);
    } catch (err: any) {
      if (attempt < maxRetries && (err.name === "TypeError" || shouldRetry(err.status ?? 0))) {
        await sleep(delays[attempt]);
        continue;
      }
      if (!silent && !(err instanceof Error && err.message.startsWith("Ошибка"))) {
        toast.error("Сервер недоступен");
      }
      throw err;
    }
  }

  throw new Error("unreachable");
}

export async function apiGet<T = any>(url: string): Promise<T | null> {
  try {
    return await apiFetch<T>(url, { silent: true });
  } catch {
    return null;
  }
}
