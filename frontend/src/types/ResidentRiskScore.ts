/** Table `resident_risk_scores` — ML reintegration readiness predictions */
export interface ResidentRiskScore {
  residentId: number
  readinessScore: number | null
  readinessLabel: string | null
  predictedReady: number | null
  predictionTimestamp: string | null
}
