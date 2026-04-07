import type { SafehouseMonthlyMetric } from "../types/SafehouseMonthlyMetric";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/SafehouseMonthlyMetrics";

export type SafehouseMonthlyMetricsListParams = {
  safehouseId?: number;
  monthStart?: string;
  page?: number;
  pageSize?: number;
};

export function fetchSafehouseMonthlyMetrics(
  params?: SafehouseMonthlyMetricsListParams,
  signal?: AbortSignal,
) {
  const query: QueryParams = {
    safehouseId: params?.safehouseId,
    monthStart: params?.monthStart,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  return apiRequest<SafehouseMonthlyMetric[]>(ROOT, { method: "GET", query, signal });
}

export function fetchSafehouseMonthlyMetricById(id: number, signal?: AbortSignal) {
  return apiRequest<SafehouseMonthlyMetric>(`${ROOT}/${id}`, { method: "GET", signal });
}
