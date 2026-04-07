import type { Resident } from "../types/Resident";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/Residents";

export type ResidentsListParams = {
  caseStatus?: string;
  safehouseId?: number;
  caseCategory?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function fetchResidents(params?: ResidentsListParams, signal?: AbortSignal) {
  const query: QueryParams = {
    caseStatus: params?.caseStatus,
    safehouseId: params?.safehouseId,
    caseCategory: params?.caseCategory,
    search: params?.search,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  return apiRequest<Resident[]>(ROOT, { method: "GET", query, signal });
}

export function fetchResidentById(id: number, signal?: AbortSignal) {
  return apiRequest<Resident>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createResident(body: Resident, signal?: AbortSignal) {
  return apiRequest<Resident>(ROOT, { method: "POST", body, signal });
}

export function updateResident(id: number, body: Resident, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteResident(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
