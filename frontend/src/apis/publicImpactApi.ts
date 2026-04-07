import type { PublicImpactSummaryDto } from "../types/apiDtos";
import type { PublicImpactSnapshot } from "../types/PublicImpactSnapshot";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/PublicImpact";

export function fetchPublicImpactSummary(signal?: AbortSignal) {
  return apiRequest<PublicImpactSummaryDto>(`${ROOT}/summary`, { method: "GET", signal });
}

export function fetchPublishedSnapshots(
  params?: { take?: number },
  signal?: AbortSignal,
) {
  const query: QueryParams = { take: params?.take };
  return apiRequest<PublicImpactSnapshot[]>(`${ROOT}/snapshots`, {
    method: "GET",
    query,
    signal,
  });
}

export function fetchPublishedSnapshotById(id: number, signal?: AbortSignal) {
  return apiRequest<PublicImpactSnapshot>(`${ROOT}/snapshots/${id}`, {
    method: "GET",
    signal,
  });
}
