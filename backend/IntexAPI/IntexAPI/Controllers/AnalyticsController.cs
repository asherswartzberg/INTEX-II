using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Reports &amp; analytics aggregates for charts and trends.</summary>
[ApiController]
[Route("api/[controller]")]
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

        var points = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate != null
                        && d.DonationDate >= from
                        && d.DonationDate <= to
                        && d.Amount != null)
            .GroupBy(d => new { d.DonationDate!.Value.Year, d.DonationDate.Value.Month })
            .Select(g => new DonationTrendPointDto(
                g.Key.Year,
                g.Key.Month,
                g.Sum(x => x.Amount ?? 0d),
                g.Count()))
            .OrderBy(p => p.Year)
            .ThenBy(p => p.Month)
            .ToListAsync(cancellationToken);

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

        var points = await _db.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(m => m.MonthStart != null && m.MonthStart >= from && m.MonthStart <= to)
            .GroupBy(m => m.MonthStart!.Value)
            .Select(g => new OutcomeTrendPointDto(
                g.Key,
                g.Average(x => x.AvgEducationProgress),
                g.Average(x => x.AvgHealthScore),
                g.Sum(x => x.ActiveResidents ?? 0)))
            .OrderBy(p => p.MonthStart)
            .ToListAsync(cancellationToken);

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
        var rows = await _db.Residents.AsNoTracking()
            .Where(r => r.ReintegrationStatus != null && r.ReintegrationStatus != "")
            .GroupBy(r => r.ReintegrationStatus)
            .Select(g => new ReintegrationStatusCountDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToListAsync(cancellationToken);

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
