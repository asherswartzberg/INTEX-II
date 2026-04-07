/** Table `donor_risk_scores` — ML donor churn predictions */
export interface DonorRiskScore {
  supporterId: number
  displayName: string | null
  supporterType: string | null
  churnRiskScore: number | null
  riskLabel: string | null
  predictedAtRisk: number | null
  recencyDays: number | null
  frequency: number | null
  predictionTimestamp: string | null
}
