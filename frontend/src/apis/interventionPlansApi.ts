import type { InterventionPlan } from "../types/InterventionPlan";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/InterventionPlans";

export type InterventionPlansListParams = {
  residentId?: number;
  upcomingConferencesOnly?: boolean;
};

export function fetchInterventionPlans(
  params?: InterventionPlansListParams,
  signal?: AbortSignal,
) {
  const query: QueryParams = {
    residentId: params?.residentId,
    upcomingConferencesOnly: params?.upcomingConferencesOnly,
  };
  return apiRequest<InterventionPlan[]>(ROOT, { method: "GET", query, signal });
}

export function fetchInterventionPlanById(id: number, signal?: AbortSignal) {
  return apiRequest<InterventionPlan>(`${ROOT}/${id}`, { method: "GET", signal });
}

export function createInterventionPlan(body: InterventionPlan, signal?: AbortSignal) {
  return apiRequest<InterventionPlan>(ROOT, { method: "POST", body, signal });
}

export function updateInterventionPlan(
  id: number,
  body: InterventionPlan,
  signal?: AbortSignal,
) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "PUT", body, signal });
}

export function deleteInterventionPlan(id: number, signal?: AbortSignal) {
  return apiRequest<void>(`${ROOT}/${id}`, { method: "DELETE", signal });
}
