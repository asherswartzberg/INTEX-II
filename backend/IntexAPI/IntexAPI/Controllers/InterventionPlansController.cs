using IntexAPI.Data;
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

    public InterventionPlansController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InterventionPlan>>> GetList(
        [FromQuery] int? residentId,
        [FromQuery] bool upcomingConferencesOnly = false,
        CancellationToken cancellationToken = default)
    {
        var q = _db.InterventionPlans.AsNoTracking().AsQueryable();

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
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InterventionPlan>> Create(
        [FromBody] InterventionPlan entity,
        CancellationToken cancellationToken)
    {
        var maxId = await _db.InterventionPlans.MaxAsync(e => (int?)e.PlanId, cancellationToken) ?? 0;
        entity.PlanId = maxId + 1;
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
