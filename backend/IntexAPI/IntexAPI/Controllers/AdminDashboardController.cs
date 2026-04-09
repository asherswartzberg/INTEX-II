using IntexAPI.Data;
using IntexAPI.Infrastructure;
using IntexAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Staff “command center” metrics.</summary>
[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = "Admin,Staff")]
public class AdminDashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public AdminDashboardController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet]
    public async Task<ActionResult<AdminDashboardDto>> GetDashboard(CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);

        var totalActive = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CaseStatus == "Active" && (isAdmin || (r.SafehouseId != null && visibleSafehouseIds.Contains(r.SafehouseId.Value))), cancellationToken);

        var bySafehouseQuery = (
            from r in _db.Residents.AsNoTracking()
            join s in _db.Safehouses.AsNoTracking() on r.SafehouseId equals s.SafehouseId into gj
            from s in gj.DefaultIfEmpty()
            where r.CaseStatus == "Active"
                  && (isAdmin || (r.SafehouseId != null && visibleSafehouseIds.Contains(r.SafehouseId.Value)))
            group r by new { r.SafehouseId, s.Name, s.SafehouseCode }
            into g
            orderby g.Key.SafehouseId
            select new ResidentsBySafehouseDto(
                g.Key.SafehouseId ?? 0,
                g.Key.Name,
                g.Key.SafehouseCode,
                g.Count()));

        var bySafehouse = await bySafehouseQuery
            .ToListAsync(cancellationToken);

        var recentDonations = await (
            from d in _db.Donations.AsNoTracking()
            join p in _db.Supporters.AsNoTracking() on d.SupporterId equals p.SupporterId into sj
            from p in sj.DefaultIfEmpty()
            orderby d.DonationDate descending
            select new RecentDonationDto(
                d.DonationId,
                d.DonationDate,
                d.DonationType,
                d.Amount,
                d.CurrencyCode,
                d.SupporterId,
                p.DisplayName))
            .Take(15)
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var upcomingConferencesQuery = (
            from plan in _db.InterventionPlans.AsNoTracking()
            where plan.CaseConferenceDate != null && plan.CaseConferenceDate >= today
            join r in _db.Residents.AsNoTracking() on plan.ResidentId equals r.ResidentId into rj
            from r in rj.DefaultIfEmpty()
            let residentSafehouseId = r.SafehouseId
            where isAdmin || residentSafehouseId == null || visibleSafehouseIds.Contains(residentSafehouseId.Value)
            orderby plan.CaseConferenceDate ascending
            select new UpcomingCaseConferenceDto(
                plan.PlanId,
                plan.ResidentId,
                r.CaseControlNo,
                plan.CaseConferenceDate,
                plan.PlanCategory,
                plan.Status));

        var upcomingConferences = await upcomingConferencesQuery
            .Take(25)
            .ToListAsync(cancellationToken);

        // Find the latest month that has a complete monthly metrics row
        var safehousesCsv = CsvSeedData.LoadSafehouses()
            .Where(s => isAdmin || visibleSafehouseIds.Contains(s.SafehouseId))
            .ToList();
        var metricsCsv = CsvSeedData.LoadSafehouseMonthlyMetrics()
            .Where(m => isAdmin || (m.SafehouseId.HasValue && visibleSafehouseIds.Contains(m.SafehouseId.Value)))
            .ToList();
        var safehouseCount = safehousesCsv.Count;
        var latestMonthStart = metricsCsv
            .Where(m =>
                m.MonthStart.HasValue &&
                m.ActiveResidents.HasValue &&
                m.AvgEducationProgress.HasValue &&
                m.AvgHealthScore.HasValue &&
                m.ProcessRecordingCount.HasValue &&
                m.HomeVisitationCount.HasValue &&
                m.IncidentCount.HasValue)
            .GroupBy(m => m.MonthStart!.Value)
            .Where(g => g.Count() == safehouseCount)
            .Select(g => g.Key)
            .OrderByDescending(x => x)
            .Cast<DateOnly?>()
            .FirstOrDefault()
            ?? metricsCsv
                .Where(m => m.MonthStart.HasValue)
                .Select(m => m.MonthStart)
                .OrderByDescending(x => x)
                .FirstOrDefault();

        List<LatestSafehouseProgressDto> progress = [];
        if (latestMonthStart.HasValue)
        {
            progress = (
                from s in safehousesCsv
                join m in metricsCsv.Where(x => x.MonthStart == latestMonthStart) on s.SafehouseId equals m.SafehouseId into mj
                from m in mj.DefaultIfEmpty()
                orderby s.SafehouseId
                select new LatestSafehouseProgressDto(
                    s.SafehouseId,
                    s.Name,
                    m != null ? m.MonthStart : latestMonthStart,
                    m != null ? m.ActiveResidents : null,
                    m != null ? m.AvgEducationProgress : null,
                    m != null ? m.AvgHealthScore : null,
                    m != null ? m.IncidentCount : null))
                .ToList();
        }

        var totalSupporters = await _db.Supporters.AsNoTracking().CountAsync(cancellationToken);
        var firstOfMonth = DateOnly.FromDateTime(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1));
        var supportersDonatedThisMonth = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= firstOfMonth && d.SupporterId != null)
            .Select(d => d.SupporterId)
            .Distinct()
            .CountAsync(cancellationToken);

        return Ok(new AdminDashboardDto(
            totalActive,
            bySafehouse,
            recentDonations,
            upcomingConferences,
            progress,
            totalSupporters,
            supportersDonatedThisMonth));
    }
}
