import type { DonationAllocation } from "../types/DonationAllocation";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/DonationAllocations";

export type DonationAllocationsListParams = {
  donationId?: number;
  safehouseId?: number;
  programArea?: string;
};

export function fetchDonationAllocations(
  params?: DonationAllocationsListParams,
  signal?: AbortSignal,
) {
  const query: QueryParams = {
    donationId: params?.donationId,
    safehouseId: params?.safehouseId,
    programArea: params?.programArea,
  };
  return apiRequest<DonationAllocation[]>(ROOT, { method: "GET", query, signal });
}

export function fetchDonationAllocationById(id: number, signal?: AbortSignal) {
  return apiRequest<DonationAllocation>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createDonationAllocation(body: DonationAllocation, signal?: AbortSignal) {
  return apiRequest<DonationAllocation>(ROOT, { method: "POST", body, signal });
}

export function updateDonationAllocation(
  id: number,
  body: DonationAllocation,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteDonationAllocation(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
