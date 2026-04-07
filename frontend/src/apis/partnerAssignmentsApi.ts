import type { PartnerAssignment } from "../types/PartnerAssignment";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/PartnerAssignments";

export type PartnerAssignmentsListParams = {
  partnerId?: number;
  safehouseId?: number;
  status?: string;
};

export function fetchPartnerAssignments(
  params?: PartnerAssignmentsListParams,
  signal?: AbortSignal,
) {
  const query: QueryParams = {
    partnerId: params?.partnerId,
    safehouseId: params?.safehouseId,
    status: params?.status,
  };
  return apiRequest<PartnerAssignment[]>(ROOT, { method: "GET", query, signal });
}

export function fetchPartnerAssignmentById(id: number, signal?: AbortSignal) {
  return apiRequest<PartnerAssignment>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createPartnerAssignment(body: PartnerAssignment, signal?: AbortSignal) {
  return apiRequest<PartnerAssignment>(ROOT, { method: "POST", body, signal });
}

export function updatePartnerAssignment(
  id: number,
  body: PartnerAssignment,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deletePartnerAssignment(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
