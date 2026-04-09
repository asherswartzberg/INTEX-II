/** Shapes returned by aggregate endpoints (camelCase JSON from ASP.NET). */

export interface PublicImpactSnapshotSummaryDto {
  snapshotId: number;
  snapshotDate: string | null;
  headline: string | null;
  summaryText: string | null;
}

export interface PublicImpactSummaryDto {
  activeResidentsCount: number;
  safehouseCount: number;
  totalDonationsAllTime: number;
  latestPublishedSnapshots: PublicImpactSnapshotSummaryDto[];
}

export interface ResidentsBySafehouseDto {
  safehouseId: number;
  safehouseName: string | null;
  safehouseCode: string | null;
  activeResidentCount: number;
}

export interface RecentDonationDto {
  donationId: number;
  donationDate: string | null;
  donationType: string | null;
  amount: number | null;
  currencyCode: string | null;
  supporterId: number | null;
  supporterDisplayName: string | null;
}

export interface UpcomingCaseConferenceDto {
  planId: number;
  residentId: number | null;
  residentCaseNo: string | null;
  caseConferenceDate: string | null;
  planCategory: string | null;
  status: string | null;
}

export interface LatestSafehouseProgressDto {
  safehouseId: number | null;
  safehouseName: string | null;
  monthStart: string | null;
  activeResidents: number | null;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  incidentCount: number | null;
}

export interface AdminDashboardDto {
  totalActiveResidents: number;
  activeResidentsBySafehouse: ResidentsBySafehouseDto[];
  recentDonations: RecentDonationDto[];
  upcomingCaseConferences: UpcomingCaseConferenceDto[];
  latestMonthlyProgressBySafehouse: LatestSafehouseProgressDto[];
  totalSupporters: number;
  supportersDonatedThisMonth: number;
}

export interface DonationTrendPointDto {
  year: number;
  month: number;
  totalAmount: number;
  donationCount: number;
}

export interface ReintegrationStatusCountDto {
  status: string | null;
  count: number;
}

export interface SafehousePerformanceDto {
  safehouseId: number;
  safehouseName: string | null;
  monthStart: string | null;
  activeResidents: number | null;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  processRecordingCount: number | null;
  homeVisitationCount: number | null;
  incidentCount: number | null;
}

export interface OutcomeTrendPointDto {
  monthStart: string;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  activeResidentsSum: number;
}
