using IntexAPI.Data;
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

    public AnalyticsController(AppDbContext db)
    {
        _db = db;
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
                g.Sum(x => x.Amount ?? 0m),
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

        var metrics = await _db.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(m => m.MonthStart != null && m.MonthStart >= from && m.MonthStart <= to)
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
        if (!month.HasValue)
        {
            month = await _db.SafehouseMonthlyMetrics.AsNoTracking()
                .MaxAsync(m => (DateOnly?)m.MonthStart, cancellationToken);
        }

        if (!month.HasValue)
            return Ok(Array.Empty<SafehousePerformanceDto>());

        var rows = await (
            from m in _db.SafehouseMonthlyMetrics.AsNoTracking()
            where m.MonthStart == month
            join s in _db.Safehouses.AsNoTracking() on m.SafehouseId equals s.SafehouseId into sj
            from s in sj.DefaultIfEmpty()
            orderby s.Name
            select new SafehousePerformanceDto(
                m.SafehouseId ?? 0,
                s.Name,
                m.MonthStart,
                m.ActiveResidents,
                m.AvgEducationProgress,
                m.AvgHealthScore,
                m.ProcessRecordingCount,
                m.HomeVisitationCount,
                m.IncidentCount))
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    [HttpGet("reintegration-summary")]
    public async Task<ActionResult<IReadOnlyList<ReintegrationStatusCountDto>>> GetReintegrationSummary(
        CancellationToken cancellationToken)
    {
        var statuses = await _db.Residents.AsNoTracking()
            .Where(r => r.ReintegrationStatus != null && r.ReintegrationStatus != "")
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
        var rows = await _db.EducationRecords.AsNoTracking()
            .Where(e => e.ResidentId != null)
            .Select(e => new { e.ResidentId, e.RecordDate, e.ProgressPercent })
            .ToListAsync(cancellationToken);

        var dict = rows
            .GroupBy(e => e.ResidentId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.RecordDate).First().ProgressPercent);

        return Ok(dict);
    }
}
