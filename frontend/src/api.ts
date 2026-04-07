const API_BASE = import.meta.env.DEV
  ? ""  // local dev uses Vite proxy
  : (import.meta.env.VITE_API_URL ?? "https://intex-backend-fvgedfcwcxf8cnc9.australiaeast-01.azurewebsites.net");

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
