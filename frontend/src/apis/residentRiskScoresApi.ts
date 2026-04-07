import type { ResidentRiskScore } from "../types/ResidentRiskScore";
import { apiRequest } from "./client";

const ROOT = "/api/ResidentRiskScores";

export function fetchResidentRiskScores(signal?: AbortSignal) {
  return apiRequest<ResidentRiskScore[]>(ROOT, { method: "GET", signal });
}
