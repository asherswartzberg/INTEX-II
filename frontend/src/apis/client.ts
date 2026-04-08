const DEFAULT_BASE = import.meta.env.DEV
  ? ""  // local dev uses Vite proxy
  : ""; // TEST: routing all traffic through SWA proxy to test Safari login

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

/** Trim trailing slash; uses `VITE_API_BASE_URL` when set in `.env`. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE;
  return raw.replace(/\/+$/, "");
}

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string | null;

  constructor(status: number, statusText: string, body: string | null) {
    super(`API ${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const fullPath = `${base}${normalized}`;

  // In dev mode, base is empty so we can't use new URL() — build query string manually
  if (!base) {
    if (!query) return fullPath;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `${fullPath}?${qs}` : fullPath;
  }

  const url = new URL(fullPath);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  query?: QueryParams;
  body?: unknown;
};

/**
 * JSON `fetch` helper. Paths are absolute from the API host, e.g. `/api/Residents`.
 * Throws {@link ApiError} when `response.ok` is false.
 */
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { query, body, headers: initHeaders, ...rest } = init;
  const url = buildUrl(path, query);

  const headers = new Headers(initHeaders);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const hasJsonBody = body !== undefined;
  const fetchInit: RequestInit = {
    ...rest,
    headers,
    credentials: "include",
  };

  if (hasJsonBody) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    fetchInit.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchInit);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, res.statusText, text || null);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as T;
}
