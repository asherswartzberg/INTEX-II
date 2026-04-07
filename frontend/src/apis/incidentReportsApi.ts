import type { IncidentReport } from "../types/IncidentReport";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/IncidentReports";

export type IncidentReportsListParams = {
  residentId?: number;
  safehouseId?: number;
  page?: number;
  pageSize?: number;
};

export function fetchIncidentReports(params?: IncidentReportsListParams, signal?: AbortSignal) {
  const query: QueryParams = {
    residentId: params?.residentId,
    safehouseId: params?.safehouseId,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  return apiRequest<IncidentReport[]>(ROOT, { method: "GET", query, signal });
}

export function fetchIncidentReportById(id: number, signal?: AbortSignal) {
  return apiRequest<IncidentReport>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createIncidentReport(body: IncidentReport, signal?: AbortSignal) {
  return apiRequest<IncidentReport>(ROOT, { method: "POST", body, signal });
}

export function updateIncidentReport(id: number, body: IncidentReport, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteIncidentReport(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
