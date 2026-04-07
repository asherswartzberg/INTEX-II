using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class PartnersController : ControllerBase
{
    private readonly AppDbContext _db;

    public PartnersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Partner>>> GetList(
        [FromQuery] string? partnerType,
        [FromQuery] string? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var q = _db.Partners.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(partnerType))
            q = q.Where(p => p.PartnerType == partnerType);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(p => p.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(p =>
                (p.PartnerName != null && p.PartnerName.Contains(s))
                || (p.ContactName != null && p.ContactName.Contains(s))
                || (p.Email != null && p.Email.Contains(s)));
        }

        var list = await q.OrderBy(p => p.PartnerName).ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Partner>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.Partners.AsNoTracking().FirstOrDefaultAsync(p => p.PartnerId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Partner>> Create([FromBody] Partner entity, CancellationToken cancellationToken)
    {
        entity.PartnerId = 0;
        _db.Partners.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.PartnerId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Partner entity, CancellationToken cancellationToken)
    {
        if (id != entity.PartnerId)
            return BadRequest();

        var existing = await _db.Partners.FindAsync(new object[] { id }, cancellationToken);
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
        var existing = await _db.Partners.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Partners.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
