import type { InKindDonationItem } from "../types/InKindDonationItem";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/InKindDonationItems";

export function fetchInKindDonationItems(
  params?: { donationId?: number },
  signal?: AbortSignal,
) {
  const query: QueryParams = { donationId: params?.donationId };
  return apiRequest<InKindDonationItem[]>(ROOT, { method: "GET", query, signal });
}

export function fetchInKindDonationItemById(id: number, signal?: AbortSignal) {
  return apiRequest<InKindDonationItem>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createInKindDonationItem(body: InKindDonationItem, signal?: AbortSignal) {
  return apiRequest<InKindDonationItem>(ROOT, { method: "POST", body, signal });
}

export function updateInKindDonationItem(
  id: number,
  body: InKindDonationItem,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteInKindDonationItem(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
