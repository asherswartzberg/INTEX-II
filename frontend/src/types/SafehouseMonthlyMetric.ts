/** Table `safehouse_monthly_metrics` */
export interface SafehouseMonthlyMetric {
  metricId: number;
  safehouseId: number | null;
  monthStart: string | null;
  monthEnd: string | null;
  activeResidents: number | null;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  processRecordingCount: number | null;
  homeVisitationCount: number | null;
  incidentCount: number | null;
  notes: string | null;
}
