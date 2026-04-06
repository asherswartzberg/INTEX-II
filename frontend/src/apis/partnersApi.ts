import type { Partner } from "../types/Partner";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/Partners";

export type PartnersListParams = {
  partnerType?: string;
  status?: string;
  search?: string;
};

export function fetchPartners(params?: PartnersListParams, signal?: AbortSignal) {
  const query: QueryParams = {
    partnerType: params?.partnerType,
    status: params?.status,
    search: params?.search,
  };
  return apiRequest<Partner[]>(ROOT, { method: "GET", query, signal });
}

export function fetchPartnerById(id: number, signal?: AbortSignal) {
  return apiRequest<Partner>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createPartner(body: Partner, signal?: AbortSignal) {
  return apiRequest<Partner>(ROOT, { method: "POST", body, signal });
}

export function updatePartner(id: number, body: Partner, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deletePartner(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
