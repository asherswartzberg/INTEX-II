import type { ProcessRecording } from "../types/ProcessRecording";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/ProcessRecordings";

export function fetchProcessRecordingsForResident(residentId: number, signal?: AbortSignal) {
  const query: QueryParams = { residentId };
  return apiRequest<ProcessRecording[]>(ROOT, { method: "GET", query, signal });
}

export function fetchProcessRecordingById(id: number, signal?: AbortSignal) {
  return apiRequest<ProcessRecording>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createProcessRecording(body: ProcessRecording, signal?: AbortSignal) {
  return apiRequest<ProcessRecording>(ROOT, { method: "POST", body, signal });
}

export function updateProcessRecording(
  id: number,
  body: ProcessRecording,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteProcessRecording(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
