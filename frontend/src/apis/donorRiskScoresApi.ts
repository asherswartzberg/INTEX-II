import type { DonorRiskScore } from "../types/DonorRiskScore";
import { apiRequest } from "./client";

const ROOT = "/api/DonorRiskScores";

export function fetchDonorRiskScores(signal?: AbortSignal) {
  return apiRequest<DonorRiskScore[]>(ROOT, { method: "GET", signal });
}

export function fetchDonorRiskScoreBySupporter(supporterId: number, signal?: AbortSignal) {
  return apiRequest<DonorRiskScore>(`${ROOT}/${supporterId}`, { method: "GET", signal });
}
