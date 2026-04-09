using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Public landing / impact dashboard — anonymized aggregates and published snapshots.</summary>
[ApiController]
[Route("api/[controller]")]
public class PublicImpactController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicImpactController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<PublicImpactSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        var activeResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CaseStatus == "Active", cancellationToken);

        var safehouseCount = await _db.Safehouses.AsNoTracking().CountAsync(cancellationToken);

        var totalDonations = await _db.Donations.AsNoTracking()
            .SumAsync(d => d.Amount ?? 0d, cancellationToken);

        var totalGirlsServed = await _db.Residents.AsNoTracking().CountAsync(cancellationToken);

        var snapshots = await _db.PublicImpactSnapshots.AsNoTracking()
            .Where(s => s.IsPublished == true)
            .OrderByDescending(s => s.SnapshotDate)
            .Take(12)
            .Select(s => new PublicImpactSnapshotSummaryDto(
                s.SnapshotId,
                s.SnapshotDate,
                s.Headline,
                s.SummaryText))
            .ToListAsync(cancellationToken);

        return Ok(new PublicImpactSummaryDto(
            activeResidents,
            safehouseCount,
            (double)totalDonations,
            totalGirlsServed,
            snapshots));
    }

    [HttpGet("snapshots")]
    public async Task<ActionResult<IEnumerable<PublicImpactSnapshot>>> GetPublishedSnapshots(
        [FromQuery] int take = 24,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, Pagination.MaxPageSize);
        var list = await _db.PublicImpactSnapshots.AsNoTracking()
            .Where(s => s.IsPublished == true)
            .OrderByDescending(s => s.SnapshotDate)
            .Take(take)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("snapshots/{id:int}")]
    public async Task<ActionResult<PublicImpactSnapshot>> GetSnapshotById(int id, CancellationToken cancellationToken)
    {
        var snapshot = await _db.PublicImpactSnapshots.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SnapshotId == id && s.IsPublished == true, cancellationToken);
        if (snapshot is null)
            return NotFound();
        return Ok(snapshot);
    }
}
