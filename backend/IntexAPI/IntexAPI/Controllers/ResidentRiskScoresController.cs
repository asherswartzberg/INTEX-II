using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>ML-generated resident incident risk predictions (read-only).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ResidentRiskScoresController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public ResidentRiskScoresController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ResidentRiskScore>>> GetAll(
        CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
        var visibleResidentIds = isAdmin
            ? new List<long>()
            : await _db.Residents.AsNoTracking()
                .Where(r => r.SafehouseId != null && visibleSafehouseIds.Contains(r.SafehouseId.Value))
                .Select(r => (long)r.ResidentId)
                .ToListAsync(cancellationToken);

        var list = await _db.ResidentRiskScores
            .AsNoTracking()
            .Where(x => isAdmin || visibleResidentIds.Contains(x.ResidentId))
            .OrderByDescending(x => x.IncidentRiskScore)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }
}
