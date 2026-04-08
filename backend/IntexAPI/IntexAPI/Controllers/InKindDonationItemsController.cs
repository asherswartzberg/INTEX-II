using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class InKindDonationItemsController : ControllerBase
{
    private readonly AppDbContext _db;

    public InKindDonationItemsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InKindDonationItem>>> GetList(
        [FromQuery] int? donationId,
        CancellationToken cancellationToken = default)
    {
        var q = _db.InKindDonationItems.AsNoTracking().AsQueryable();
        if (donationId is int d)
            q = q.Where(i => i.DonationId == d);

        var list = await q.OrderBy(i => i.ItemId).ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InKindDonationItem>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.InKindDonationItems.AsNoTracking()
            .FirstOrDefaultAsync(i => i.ItemId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<InKindDonationItem>> Create(
        [FromBody] InKindDonationItem entity,
        CancellationToken cancellationToken)
    {
        var maxId = await _db.InKindDonationItems.MaxAsync(e => (int?)e.ItemId, cancellationToken) ?? 0;
        entity.ItemId = maxId + 1;
        _db.InKindDonationItems.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.ItemId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] InKindDonationItem entity, CancellationToken cancellationToken)
    {
        if (id != entity.ItemId)
            return BadRequest();

        var existing = await _db.InKindDonationItems.FindAsync(new object[] { id }, cancellationToken);
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
        var existing = await _db.InKindDonationItems.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.InKindDonationItems.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
