using IntexAPI.Data;
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

    public SafehousesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Safehouse>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _db.Safehouses.AsNoTracking()
            .OrderBy(s => s.SafehouseCode)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Safehouse>> GetById(int id, CancellationToken cancellationToken)
    {
        var safehouse = await _db.Safehouses.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == id, cancellationToken);
        return safehouse is null ? NotFound() : Ok(safehouse);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Safehouse>> Create([FromBody] Safehouse entity, CancellationToken cancellationToken)
    {
        entity.SafehouseId = 0;
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
