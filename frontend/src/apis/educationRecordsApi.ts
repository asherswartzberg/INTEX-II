import type { EducationRecord } from "../types/EducationRecord";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/EducationRecords";

export interface EducationSummary {
  totalRecords: number;
  averageAttendanceRate: number | null;
  averageProgressPercent: number | null;
  enrollmentBreakdown: { status: string; count: number }[];
  completionBreakdown: { status: string; count: number }[];
}

export function fetchEducationSummary(signal?: AbortSignal) {
  return apiRequest<EducationSummary>(`${ROOT}/summary`, { method: "GET", signal });
}

export function fetchEducationRecordsForResident(
  residentId: number,
  signal?: AbortSignal,
) {
  const query: QueryParams = { residentId };
  return apiRequest<EducationRecord[]>(ROOT, { method: "GET", query, signal });
}

export function fetchEducationRecordById(id: number, signal?: AbortSignal) {
  return apiRequest<EducationRecord>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createEducationRecord(body: EducationRecord, signal?: AbortSignal) {
  return apiRequest<EducationRecord>(ROOT, { method: "POST", body, signal });
}

export function updateEducationRecord(
  id: number,
  body: EducationRecord,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteEducationRecord(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
