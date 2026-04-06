using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DonationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Donation>>> GetList(
        [FromQuery] int? supporterId,
        [FromQuery] string? donationType,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Pagination.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var (skip, take) = Pagination.ToSkipTake(page, pageSize);
        var q = _db.Donations.AsNoTracking().AsQueryable();

        if (supporterId is int sid)
            q = q.Where(d => d.SupporterId == sid);
        if (!string.IsNullOrWhiteSpace(donationType))
            q = q.Where(d => d.DonationType == donationType);
        if (fromDate is DateOnly fd)
            q = q.Where(d => d.DonationDate >= fd);
        if (toDate is DateOnly td)
            q = q.Where(d => d.DonationDate <= td);

        var list = await q
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Donation>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.Donations.AsNoTracking()
            .FirstOrDefaultAsync(d => d.DonationId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpGet("{id:int}/allocations")]
    public async Task<ActionResult<IEnumerable<DonationAllocation>>> GetAllocations(
        int id,
        CancellationToken cancellationToken)
    {
        var list = await _db.DonationAllocations.AsNoTracking()
            .Where(a => a.DonationId == id)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<Donation>> Create([FromBody] Donation entity, CancellationToken cancellationToken)
    {
        entity.DonationId = 0;
        _db.Donations.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.DonationId }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Donation entity, CancellationToken cancellationToken)
    {
        if (id != entity.DonationId)
            return BadRequest();

        var existing = await _db.Donations.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.Donations.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Donations.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
