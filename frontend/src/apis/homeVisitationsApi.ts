import type { HomeVisitation } from "../types/HomeVisitation";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/HomeVisitations";

export function fetchHomeVisitationsForResident(residentId: number, signal?: AbortSignal) {
  const query: QueryParams = { residentId };
  return apiRequest<HomeVisitation[]>(ROOT, { method: "GET", query, signal });
}

export function fetchHomeVisitationById(id: number, signal?: AbortSignal) {
  return apiRequest<HomeVisitation>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createHomeVisitation(body: HomeVisitation, signal?: AbortSignal) {
  return apiRequest<HomeVisitation>(ROOT, { method: "POST", body, signal });
}

export function updateHomeVisitation(id: number, body: HomeVisitation, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteHomeVisitation(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
