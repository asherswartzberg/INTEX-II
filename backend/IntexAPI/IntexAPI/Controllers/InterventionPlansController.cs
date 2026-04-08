using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Case conference dates and intervention plans per resident.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class InterventionPlansController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public InterventionPlansController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InterventionPlan>>> GetList(
        [FromQuery] int? residentId,
        [FromQuery] bool upcomingConferencesOnly = false,
        CancellationToken cancellationToken = default)
    {
        var isAdmin = User.IsInRole(AuthRoles.Admin);
        var visibleSafehouseIds = isAdmin
            ? await _db.Safehouses.AsNoTracking().Select(s => s.SafehouseId).ToHashSetAsync(cancellationToken)
            : await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);

        var q = _db.InterventionPlans.AsNoTracking().AsQueryable();

        if (!isAdmin)
        {
            var visibleResidentIds = await _db.Residents.AsNoTracking()
                .Where(r => r.SafehouseId != null && visibleSafehouseIds.Contains(r.SafehouseId.Value))
                .Select(r => r.ResidentId)
                .ToListAsync(cancellationToken);
            q = q.Where(p => p.ResidentId != null && visibleResidentIds.Contains(p.ResidentId.Value));
        }

        if (residentId is int rid)
            q = q.Where(p => p.ResidentId == rid);

        if (upcomingConferencesOnly)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            q = q.Where(p => p.CaseConferenceDate != null && p.CaseConferenceDate >= today);
        }

        var list = await q
            .OrderBy(p => p.CaseConferenceDate)
            .ThenBy(p => p.PlanId)
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InterventionPlan>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.InterventionPlans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PlanId == id, cancellationToken);
        if (entity is not null && !User.IsInRole(AuthRoles.Admin))
        {
            var residentSafehouseId = await _db.Residents.AsNoTracking()
                .Where(r => r.ResidentId == entity.ResidentId)
                .Select(r => r.SafehouseId)
                .FirstOrDefaultAsync(cancellationToken);
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!residentSafehouseId.HasValue || !allowed.Contains(residentSafehouseId.Value))
                return NotFound();
        }
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InterventionPlan>> Create(
        [FromBody] InterventionPlan entity,
        CancellationToken cancellationToken)
    {
        entity.PlanId = 0;
        _db.InterventionPlans.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.PlanId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] InterventionPlan entity, CancellationToken cancellationToken)
    {
        if (id != entity.PlanId)
            return BadRequest();

        var existing = await _db.InterventionPlans.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.InterventionPlans.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.InterventionPlans.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
