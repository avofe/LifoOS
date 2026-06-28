import { toast } from "sonner";

type FetchOpts = RequestInit & { silent?: boolean };

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
      const res = await fetch(url, init);

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return res.json();
      }

      const body = await res.json().catch(() => ({}));
      const detail = body.error ?? `Ошибка ${res.status}`;

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
