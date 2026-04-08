using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class HomeVisitationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public HomeVisitationsController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HomeVisitation>>> GetList(
        [FromQuery] int residentId,
        CancellationToken cancellationToken = default)
    {
        if (residentId <= 0)
            return BadRequest("Query parameter residentId is required.");

        if (!User.IsInRole(AuthRoles.Admin))
        {
            var residentSafehouseId = await _db.Residents.AsNoTracking()
                .Where(r => r.ResidentId == residentId)
                .Select(r => r.SafehouseId)
                .FirstOrDefaultAsync(cancellationToken);
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!residentSafehouseId.HasValue || !allowed.Contains(residentSafehouseId.Value))
                return NotFound();
        }

        var list = await _db.HomeVisitations.AsNoTracking()
            .Where(v => v.ResidentId == residentId)
            .OrderBy(v => v.VisitDate)
            .ThenBy(v => v.VisitationId)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HomeVisitation>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.HomeVisitations.AsNoTracking()
            .FirstOrDefaultAsync(v => v.VisitationId == id, cancellationToken);
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
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<HomeVisitation>> Create(
        [FromBody] HomeVisitation entity,
        CancellationToken cancellationToken)
    {
        entity.VisitationId = 0;
        _db.HomeVisitations.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.VisitationId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] HomeVisitation entity, CancellationToken cancellationToken)
    {
        if (id != entity.VisitationId)
            return BadRequest();

        var existing = await _db.HomeVisitations.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.HomeVisitations.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.HomeVisitations.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
