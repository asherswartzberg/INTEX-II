using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Staff “command center” metrics.</summary>
[ApiController]
[Route("api/admin/dashboard")]
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
            where plan.CaseConferenceDate != null && plan.CaseConferenceDate >= today
            join r in _db.Residents.AsNoTracking() on plan.ResidentId equals r.ResidentId into rj
            from r in rj.DefaultIfEmpty()
            orderby plan.CaseConferenceDate
            select new UpcomingCaseConferenceDto(
                plan.PlanId,
                plan.ResidentId,
                r.CaseControlNo,
                plan.CaseConferenceDate,
                plan.PlanCategory,
                plan.Status))
            .Take(25)
            .ToListAsync(cancellationToken);

        var latestMonthStart = await _db.SafehouseMonthlyMetrics.AsNoTracking()
            .MaxAsync(m => (DateOnly?)m.MonthStart, cancellationToken);

        List<LatestSafehouseProgressDto> progress = [];
        if (latestMonthStart.HasValue)
        {
            progress = await (
                from m in _db.SafehouseMonthlyMetrics.AsNoTracking()
                where m.MonthStart == latestMonthStart
                join s in _db.Safehouses.AsNoTracking() on m.SafehouseId equals s.SafehouseId into sj
                from s in sj.DefaultIfEmpty()
                orderby m.SafehouseId
                select new LatestSafehouseProgressDto(
                    m.SafehouseId,
                    s.Name,
                    m.MonthStart,
                    m.ActiveResidents,
                    m.AvgEducationProgress,
                    m.AvgHealthScore,
                    m.IncidentCount))
                .ToListAsync(cancellationToken);
        }

        return Ok(new AdminDashboardDto(
            totalActive,
            bySafehouse,
            recentDonations,
            upcomingConferences,
            progress));
    }
}
