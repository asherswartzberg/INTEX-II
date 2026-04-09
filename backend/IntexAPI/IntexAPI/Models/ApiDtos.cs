namespace IntexAPI.Models;

// --- Public impact ---
public record PublicImpactSummaryDto(
    int ActiveResidentsCount,
    int SafehouseCount,
    double TotalDonationsAllTime,
    int TotalGirlsServed,
    IReadOnlyList<PublicImpactSnapshotSummaryDto> LatestPublishedSnapshots);

public record PublicImpactSnapshotSummaryDto(
    int SnapshotId,
    DateOnly? SnapshotDate,
    string? Headline,
    string? SummaryText);

// --- Admin dashboard ---
public record AdminDashboardDto(
    int TotalActiveResidents,
    IReadOnlyList<ResidentsBySafehouseDto> ActiveResidentsBySafehouse,
    IReadOnlyList<RecentDonationDto> RecentDonations,
    IReadOnlyList<UpcomingCaseConferenceDto> UpcomingCaseConferences,
    IReadOnlyList<LatestSafehouseProgressDto> LatestMonthlyProgressBySafehouse,
    int TotalSupporters,
    int SupportersDonatedThisMonth);

public record ResidentsBySafehouseDto(int SafehouseId, string? SafehouseName, string? SafehouseCode, int ActiveResidentCount);

public record RecentDonationDto(
    int DonationId,
    DateOnly? DonationDate,
    string? DonationType,
    double? Amount,
    string? CurrencyCode,
    int? SupporterId,
    string? SupporterDisplayName);

public record UpcomingCaseConferenceDto(
    int PlanId,
    int? ResidentId,
    string? ResidentCaseNo,
    DateOnly? CaseConferenceDate,
    string? PlanCategory,
    string? Status);

public record LatestSafehouseProgressDto(
    int? SafehouseId,
    string? SafehouseName,
    DateOnly? MonthStart,
    int? ActiveResidents,
    double? AvgEducationProgress,
    double? AvgHealthScore,
    int? IncidentCount);

// --- Analytics ---
public record DonationTrendPointDto(int Year, int Month, double TotalAmount, int DonationCount);

public record ReintegrationStatusCountDto(string? Status, int Count);

public record SafehousePerformanceDto(
    int SafehouseId,
    string? SafehouseName,
    DateOnly? MonthStart,
    int? ActiveResidents,
    double? AvgEducationProgress,
    double? AvgHealthScore,
    int? ProcessRecordingCount,
    int? HomeVisitationCount,
    int? IncidentCount);

public record OutcomeTrendPointDto(
    DateOnly MonthStart,
    double? AvgEducationProgress,
    double? AvgHealthScore,
    int ActiveResidentsSum);
