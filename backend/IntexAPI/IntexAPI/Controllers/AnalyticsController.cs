using IntexAPI.Data;
using IntexAPI.Infrastructure;
using IntexAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Reports &amp; analytics aggregates for charts and trends.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public AnalyticsController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet("donation-trends")]
    public async Task<ActionResult<IReadOnlyList<DonationTrendPointDto>>> GetDonationTrends(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        to ??= DateOnly.FromDateTime(DateTime.UtcNow);
        from ??= to.Value.AddMonths(-24);

        var donations = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= from
                        && d.DonationDate <= to
                        && d.Amount != null)
            .Select(d => new { d.DonationDate, d.Amount })
            .ToListAsync(cancellationToken);

        var points = donations
            .GroupBy(d => new { d.DonationDate!.Value.Year, d.DonationDate.Value.Month })
            .Select(g => new DonationTrendPointDto(
                g.Key.Year,
                g.Key.Month,
                g.Sum(x => x.Amount ?? 0d),
                g.Count()))
            .OrderBy(p => p.Year)
            .ThenBy(p => p.Month)
            .ToList();

        return Ok(points);
    }

    [HttpGet("resident-outcomes")]
    public async Task<ActionResult<IReadOnlyList<OutcomeTrendPointDto>>> GetResidentOutcomeTrends(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        to ??= DateOnly.FromDateTime(DateTime.UtcNow);
        from ??= to.Value.AddMonths(-24);
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);

        var metrics = await _db.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(m => m.MonthStart != null && m.MonthStart >= from && m.MonthStart <= to)
            .Where(m => isAdmin || (m.SafehouseId != null && visibleSafehouseIds.Contains(m.SafehouseId.Value)))
            .Select(m => new { m.MonthStart, m.AvgEducationProgress, m.AvgHealthScore, m.ActiveResidents })
            .ToListAsync(cancellationToken);

        var points = metrics
            .GroupBy(m => m.MonthStart!.Value)
            .Select(g => new OutcomeTrendPointDto(
                g.Key,
                g.Where(x => x.AvgEducationProgress.HasValue).Select(x => x.AvgEducationProgress).DefaultIfEmpty().Average(),
                g.Where(x => x.AvgHealthScore.HasValue).Select(x => x.AvgHealthScore).DefaultIfEmpty().Average(),
                g.Sum(x => x.ActiveResidents ?? 0)))
            .OrderBy(p => p.MonthStart)
            .ToList();

        return Ok(points);
    }

    [HttpGet("safehouse-performance")]
    public async Task<ActionResult<IReadOnlyList<SafehousePerformanceDto>>> GetSafehousePerformance(
        [FromQuery] DateOnly? month,
        CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);

        if (!month.HasValue)
        {
            var safehouses = CsvSeedData.LoadSafehouses();
            var metrics = CsvSeedData.LoadSafehouseMonthlyMetrics();
            if (!isAdmin)
            {
                safehouses = safehouses.Where(s => visibleSafehouseIds.Contains(s.SafehouseId)).ToList();
                metrics = metrics.Where(m => m.SafehouseId.HasValue && visibleSafehouseIds.Contains(m.SafehouseId.Value)).ToList();
            }
            var safehouseCount = safehouses.Count;

            month = metrics
                .Where(m =>
                    m.MonthStart.HasValue &&
                    m.ActiveResidents.HasValue &&
                    m.AvgEducationProgress.HasValue &&
                    m.AvgHealthScore.HasValue &&
                    m.ProcessRecordingCount.HasValue &&
                    m.HomeVisitationCount.HasValue &&
                    m.IncidentCount.HasValue)
                .GroupBy(m => m.MonthStart!.Value)
                .Where(m =>
                    m.Count() == safehouseCount)
                .Select(g => g.Key)
                .OrderByDescending(x => x)
                .FirstOrDefault();

            if (!month.HasValue)
            {
                month = metrics
                    .Where(m => m.MonthStart.HasValue)
                    .Select(m => m.MonthStart!.Value)
                    .OrderByDescending(x => x)
                    .Cast<DateOnly?>()
                    .FirstOrDefault();
            }
        }

        if (!month.HasValue)
            return Ok(Array.Empty<SafehousePerformanceDto>());

        var safehousesCsv = CsvSeedData.LoadSafehouses();
        var metricsCsv = CsvSeedData.LoadSafehouseMonthlyMetrics();
        if (!isAdmin)
        {
            safehousesCsv = safehousesCsv.Where(s => visibleSafehouseIds.Contains(s.SafehouseId)).ToList();
            metricsCsv = metricsCsv.Where(m => m.SafehouseId.HasValue && visibleSafehouseIds.Contains(m.SafehouseId.Value)).ToList();
        }
        var rows = (
            from s in safehousesCsv
            join m in metricsCsv.Where(x => x.MonthStart == month) on s.SafehouseId equals m.SafehouseId into mj
            from m in mj.DefaultIfEmpty()
            orderby s.SafehouseId
            select new SafehousePerformanceDto(
                s.SafehouseId,
                s.Name,
                m != null ? m.MonthStart : month,
                m != null ? m.ActiveResidents : null,
                m != null ? m.AvgEducationProgress : null,
                m != null ? m.AvgHealthScore : null,
                m != null ? m.ProcessRecordingCount : null,
                m != null ? m.HomeVisitationCount : null,
                m != null ? m.IncidentCount : null))
            .ToList();

        return Ok(rows);
    }

    [HttpGet("reintegration-summary")]
    public async Task<ActionResult<IReadOnlyList<ReintegrationStatusCountDto>>> GetReintegrationSummary(
        CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);

        var statuses = await _db.Residents.AsNoTracking()
            .Where(r => r.ReintegrationStatus != null && r.ReintegrationStatus != "")
            .Where(r => isAdmin || (r.SafehouseId != null && visibleSafehouseIds.Contains(r.SafehouseId.Value)))
            .Select(r => r.ReintegrationStatus)
            .ToListAsync(cancellationToken);

        var rows = statuses
            .GroupBy(status => status)
            .Select(g => new ReintegrationStatusCountDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        return Ok(rows);
    }

    [HttpGet("education-progress-by-resident")]
    public async Task<ActionResult<Dictionary<int, double?>>> GetLatestEducationProgressByResident(
        CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);

        var rows = await _db.EducationRecords.AsNoTracking()
            .Where(e => e.ResidentId != null)
            .Select(e => new { e.ResidentId, e.RecordDate, e.ProgressPercent })
            .ToListAsync(cancellationToken);

        if (!isAdmin)
        {
            var residentIds = await _db.Residents.AsNoTracking()
                .Where(r => r.SafehouseId != null && visibleSafehouseIds.Contains(r.SafehouseId.Value))
                .Select(r => r.ResidentId)
                .ToListAsync(cancellationToken);
            rows = rows.Where(e => e.ResidentId.HasValue && residentIds.Contains(e.ResidentId.Value)).ToList();
        }

        var dict = rows
            .GroupBy(e => e.ResidentId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.RecordDate).First().ProgressPercent);

        return Ok(dict);
    }
}
