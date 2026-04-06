using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public IncidentReportsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<IncidentReport>>> GetList(
        [FromQuery] int? residentId,
        [FromQuery] int? safehouseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Pagination.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var (skip, take) = Pagination.ToSkipTake(page, pageSize);
        var q = _db.IncidentReports.AsNoTracking().AsQueryable();
        if (residentId is int r)
            q = q.Where(i => i.ResidentId == r);
        if (safehouseId is int s)
            q = q.Where(i => i.SafehouseId == s);

        var list = await q
            .OrderByDescending(i => i.IncidentDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IncidentReport>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.IncidentReports.AsNoTracking()
            .FirstOrDefaultAsync(i => i.IncidentId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<IncidentReport>> Create(
        [FromBody] IncidentReport entity,
        CancellationToken cancellationToken)
    {
        entity.IncidentId = 0;
        _db.IncidentReports.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.IncidentId }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] IncidentReport entity, CancellationToken cancellationToken)
    {
        if (id != entity.IncidentId)
            return BadRequest();

        var existing = await _db.IncidentReports.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.IncidentReports.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.IncidentReports.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
