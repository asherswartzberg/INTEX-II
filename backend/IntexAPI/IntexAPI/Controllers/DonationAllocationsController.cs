using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationAllocationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DonationAllocationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DonationAllocation>>> GetList(
        [FromQuery] int? donationId,
        [FromQuery] int? safehouseId,
        [FromQuery] string? programArea,
        CancellationToken cancellationToken = default)
    {
        var q = _db.DonationAllocations.AsNoTracking().AsQueryable();
        if (donationId is int d)
            q = q.Where(a => a.DonationId == d);
        if (safehouseId is int s)
            q = q.Where(a => a.SafehouseId == s);
        if (!string.IsNullOrWhiteSpace(programArea))
            q = q.Where(a => a.ProgramArea == programArea);

        var list = await q
            .OrderByDescending(a => a.AllocationDate)
            .Take(Pagination.MaxPageSize)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DonationAllocation>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.DonationAllocations.AsNoTracking()
            .FirstOrDefaultAsync(a => a.AllocationId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<DonationAllocation>> Create(
        [FromBody] DonationAllocation entity,
        CancellationToken cancellationToken)
    {
        entity.AllocationId = 0;
        _db.DonationAllocations.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.AllocationId }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] DonationAllocation entity, CancellationToken cancellationToken)
    {
        if (id != entity.AllocationId)
            return BadRequest();

        var existing = await _db.DonationAllocations.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.DonationAllocations.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.DonationAllocations.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
