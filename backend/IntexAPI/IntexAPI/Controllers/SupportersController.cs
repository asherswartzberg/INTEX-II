using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Donor/supporter profiles for staff portal.</summary>
[ApiController]
[Route("api/[controller]")]
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SupportersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Supporter>>> GetList(
        [FromQuery] string? supporterType,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Pagination.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var (skip, take) = Pagination.ToSkipTake(page, pageSize);
        var q = _db.Supporters.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(supporterType))
            q = q.Where(s => s.SupporterType == supporterType);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(s => s.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(x =>
                (x.DisplayName != null && x.DisplayName.Contains(s))
                || (x.Email != null && x.Email.Contains(s))
                || (x.FirstName != null && x.FirstName.Contains(s))
                || (x.LastName != null && x.LastName.Contains(s)));
        }

        var list = await q.OrderBy(x => x.DisplayName).Skip(skip).Take(take).ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Supporter>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.Supporters.AsNoTracking().FirstOrDefaultAsync(s => s.SupporterId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpGet("{id:int}/donations")]
    public async Task<ActionResult<IEnumerable<Donation>>> GetDonationsForSupporter(
        int id,
        CancellationToken cancellationToken)
    {
        var list = await _db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == id)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<Supporter>> Create([FromBody] Supporter entity, CancellationToken cancellationToken)
    {
        entity.SupporterId = 0;
        _db.Supporters.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.SupporterId }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Supporter entity, CancellationToken cancellationToken)
    {
        if (id != entity.SupporterId)
            return BadRequest();

        var existing = await _db.Supporters.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.Supporters.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Supporters.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
