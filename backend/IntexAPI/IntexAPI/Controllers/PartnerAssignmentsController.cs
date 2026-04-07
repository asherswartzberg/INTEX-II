using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class PartnerAssignmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PartnerAssignmentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PartnerAssignment>>> GetList(
        [FromQuery] int? partnerId,
        [FromQuery] int? safehouseId,
        [FromQuery] string? status,
        CancellationToken cancellationToken = default)
    {
        var q = _db.PartnerAssignments.AsNoTracking().AsQueryable();
        if (partnerId is int p)
            q = q.Where(a => a.PartnerId == p);
        if (safehouseId is int s)
            q = q.Where(a => a.SafehouseId == s);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(a => a.Status == status);

        var list = await q.OrderBy(a => a.AssignmentStart).ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PartnerAssignment>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.PartnerAssignments.AsNoTracking()
            .FirstOrDefaultAsync(a => a.AssignmentId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PartnerAssignment>> Create(
        [FromBody] PartnerAssignment entity,
        CancellationToken cancellationToken)
    {
        entity.AssignmentId = 0;
        _db.PartnerAssignments.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.AssignmentId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] PartnerAssignment entity, CancellationToken cancellationToken)
    {
        if (id != entity.AssignmentId)
            return BadRequest();

        var existing = await _db.PartnerAssignments.FindAsync(new object[] { id }, cancellationToken);
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
        var existing = await _db.PartnerAssignments.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.PartnerAssignments.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
