import type {
  DonationTrendPointDto,
  OutcomeTrendPointDto,
  ReintegrationStatusCountDto,
  SafehousePerformanceDto,
} from "../types/apiDtos";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/Analytics";

export function fetchDonationTrends(
  params?: { from?: string; to?: string },
  signal?: AbortSignal,
) {
  const query: QueryParams = { from: params?.from, to: params?.to };
  return apiRequest<DonationTrendPointDto[]>(`${ROOT}/donation-trends`, {
    method: "GET",
    query,
    signal,
  });
}

export function fetchResidentOutcomes(
  params?: { from?: string; to?: string },
  signal?: AbortSignal,
) {
  const query: QueryParams = { from: params?.from, to: params?.to };
  return apiRequest<OutcomeTrendPointDto[]>(`${ROOT}/resident-outcomes`, {
    method: "GET",
    query,
    signal,
  });
}

export function fetchSafehousePerformance(
  params?: { month?: string },
  signal?: AbortSignal,
) {
  const query: QueryParams = { month: params?.month };
  return apiRequest<SafehousePerformanceDto[]>(`${ROOT}/safehouse-performance`, {
    method: "GET",
    query,
    signal,
  });
}

export function fetchReintegrationSummary(signal?: AbortSignal) {
  return apiRequest<ReintegrationStatusCountDto[]>(`${ROOT}/reintegration-summary`, {
    method: "GET",
    signal,
  });
}

export function fetchEducationProgressByResident(signal?: AbortSignal) {
  return apiRequest<Record<string, number | null>>(`${ROOT}/education-progress-by-resident`, {
    method: "GET",
    signal,
  });
}
