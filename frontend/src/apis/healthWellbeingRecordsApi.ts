import type { HealthWellbeingRecord } from "../types/HealthWellbeingRecord";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/HealthWellbeingRecords";

export function fetchHealthRecordsForResident(residentId: number, signal?: AbortSignal) {
  const query: QueryParams = { residentId };
  return apiRequest<HealthWellbeingRecord[]>(ROOT, { method: "GET", query, signal });
}

export function fetchHealthWellbeingRecordById(id: number, signal?: AbortSignal) {
  return apiRequest<HealthWellbeingRecord>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createHealthWellbeingRecord(
  body: HealthWellbeingRecord,
  signal?: AbortSignal,
) {
  return apiRequest<HealthWellbeingRecord>(ROOT, { method: "POST", body, signal });
}

export function updateHealthWellbeingRecord(
  id: number,
  body: HealthWellbeingRecord,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteHealthWellbeingRecord(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
