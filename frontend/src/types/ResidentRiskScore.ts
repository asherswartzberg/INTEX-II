/** Table `resident_risk_scores` — ML incident risk predictions */
export interface ResidentRiskScore {
  residentId: number
  incidentRiskScore: number | null
  riskLabel: string | null
  predictedHighRisk: number | null
  topFactors: string | null
  predictionTimestamp: string | null
}
