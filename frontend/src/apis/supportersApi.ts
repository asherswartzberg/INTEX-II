import type { Donation } from "../types/Donation";
import type { Supporter } from "../types/Supporter";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/Supporters";

export type SupportersListParams = {
  supporterType?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function fetchSupporters(params?: SupportersListParams, signal?: AbortSignal) {
  const query: QueryParams = {
    supporterType: params?.supporterType,
    status: params?.status,
    search: params?.search,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  return apiRequest<Supporter[]>(ROOT, { method: "GET", query, signal });
}

export function fetchSupporterById(id: number, signal?: AbortSignal) {
  return apiRequest<Supporter>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function fetchDonationsForSupporter(id: number, signal?: AbortSignal) {
  return apiRequest<Donation[]>(`${ROOT}/${id}/donations`, { method: "GET", signal });
}

export function createSupporter(body: Supporter, signal?: AbortSignal) {
  return apiRequest<Supporter>(ROOT, { method: "POST", body, signal });
}

export function updateSupporter(id: number, body: Supporter, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteSupporter(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
