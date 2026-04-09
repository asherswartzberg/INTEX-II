using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SafehousesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public SafehousesController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Safehouse>>> GetAll(CancellationToken cancellationToken)
    {
        var query = _db.Safehouses.AsNoTracking().AsQueryable();
        if (!User.IsInRole(AuthRoles.Admin))
        {
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            query = query.Where(s => allowed.Contains(s.SafehouseId));
        }

        var list = await query
            .OrderBy(s => s.SafehouseCode)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Safehouse>> GetById(int id, CancellationToken cancellationToken)
    {
        var safehouse = await _db.Safehouses.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == id, cancellationToken);
        if (safehouse is not null && !User.IsInRole(AuthRoles.Admin))
        {
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!allowed.Contains(safehouse.SafehouseId))
                return NotFound();
        }
        return safehouse is null ? NotFound() : Ok(safehouse);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Safehouse>> Create([FromBody] Safehouse entity, CancellationToken cancellationToken)
    {
        var maxId = await _db.Safehouses.MaxAsync(e => (int?)e.SafehouseId, cancellationToken) ?? 0;
        entity.SafehouseId = maxId + 1;
        _db.Safehouses.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.SafehouseId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Safehouse entity, CancellationToken cancellationToken)
    {
        if (id != entity.SafehouseId)
            return BadRequest();

        var existing = await _db.Safehouses.FindAsync(new object[] { id }, cancellationToken);
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
        var existing = await _db.Safehouses.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Safehouses.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
