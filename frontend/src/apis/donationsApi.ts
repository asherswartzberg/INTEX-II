import type { Donation } from "../types/Donation";
import type { DonationAllocation } from "../types/DonationAllocation";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/Donations";

export type DonationsListParams = {
  supporterId?: number;
  donationType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export function fetchDonations(params?: DonationsListParams, signal?: AbortSignal) {
  const query: QueryParams = {
    supporterId: params?.supporterId,
    donationType: params?.donationType,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  return apiRequest<Donation[]>(ROOT, { method: "GET", query, signal });
}

export function fetchDonationById(id: number, signal?: AbortSignal) {
  return apiRequest<Donation>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function fetchAllocationsForDonation(id: number, signal?: AbortSignal) {
  return apiRequest<DonationAllocation[]>(`${ROOT}/${id}/allocations`, {
    method: "GET",
    signal,
  });
}

export function createDonation(body: Donation, signal?: AbortSignal) {
  return apiRequest<Donation>(ROOT, { method: "POST", body, signal });
}

export function updateDonation(id: number, body: Donation, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteDonation(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
