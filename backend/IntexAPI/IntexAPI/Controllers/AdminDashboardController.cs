using IntexAPI.Data;
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

    public AdminDashboardController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<AdminDashboardDto>> GetDashboard(CancellationToken cancellationToken)
    {
        var totalActive = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CaseStatus == "Active", cancellationToken);

        var bySafehouse = await (
            from r in _db.Residents.AsNoTracking()
            join s in _db.Safehouses.AsNoTracking() on r.SafehouseId equals s.SafehouseId into gj
            from s in gj.DefaultIfEmpty()
            where r.CaseStatus == "Active"
            group r by new { r.SafehouseId, s.Name, s.SafehouseCode }
            into g
            orderby g.Key.SafehouseId
            select new ResidentsBySafehouseDto(
                g.Key.SafehouseId ?? 0,
                g.Key.Name,
                g.Key.SafehouseCode,
                g.Count()))
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
        var upcomingConferences = await (
            from plan in _db.InterventionPlans.AsNoTracking()
            where plan.CaseConferenceDate != null
            join r in _db.Residents.AsNoTracking() on plan.ResidentId equals r.ResidentId into rj
            from r in rj.DefaultIfEmpty()
            orderby plan.CaseConferenceDate descending
            select new UpcomingCaseConferenceDto(
                plan.PlanId,
                plan.ResidentId,
                r.CaseControlNo,
                plan.CaseConferenceDate,
                plan.PlanCategory,
                plan.Status))
            .Take(25)
            .ToListAsync(cancellationToken);

        // Find the latest month that has a complete monthly metrics row
        var safehousesCsv = CsvSeedData.LoadSafehouses();
        var metricsCsv = CsvSeedData.LoadSafehouseMonthlyMetrics();
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

        return Ok(new AdminDashboardDto(
            totalActive,
            bySafehouse,
            recentDonations,
            upcomingConferences,
            progress));
    }
}
