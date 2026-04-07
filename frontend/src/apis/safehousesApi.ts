import type { Safehouse } from "../types/Safehouse";
import { apiRequest } from "./client";

const ROOT = "/api/Safehouses";

export function fetchSafehouses(signal?: AbortSignal) {
  return apiRequest<Safehouse[]>(ROOT, { method: "GET", signal });
}

export function fetchSafehouseById(id: number, signal?: AbortSignal) {
  return apiRequest<Safehouse>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createSafehouse(body: Safehouse, signal?: AbortSignal) {
  return apiRequest<Safehouse>(ROOT, { method: "POST", body, signal });
}

export function updateSafehouse(id: number, body: Safehouse, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteSafehouse(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
