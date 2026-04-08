using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Caseload inventory — residents with search/filter and CRUD.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResidentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Resident>>> GetList(
        [FromQuery] string? caseStatus,
        [FromQuery] int? safehouseId,
        [FromQuery] string? caseCategory,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Pagination.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var (skip, take) = Pagination.ToSkipTake(page, pageSize);
        var q = _db.Residents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(caseStatus))
            q = q.Where(r => r.CaseStatus == caseStatus);

        if (safehouseId is int sh)
            q = q.Where(r => r.SafehouseId == sh);

        if (!string.IsNullOrWhiteSpace(caseCategory))
            q = q.Where(r => r.CaseCategory == caseCategory);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(r =>
                (r.CaseControlNo != null && r.CaseControlNo.Contains(s))
                || (r.InternalCode != null && r.InternalCode.Contains(s))
                || (r.ReferralSource != null && r.ReferralSource.Contains(s)));
        }

        var list = await q
            .OrderBy(r => r.CaseControlNo)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Resident>> GetById(int id, CancellationToken cancellationToken)
    {
        var resident = await _db.Residents.AsNoTracking()
            .FirstOrDefaultAsync(r => r.ResidentId == id, cancellationToken);
        return resident is null ? NotFound() : Ok(resident);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Resident>> Create([FromBody] Resident resident, CancellationToken cancellationToken)
    {
        var maxId = await _db.Residents.MaxAsync(r => (int?)r.ResidentId, cancellationToken) ?? 0;
        resident.ResidentId = maxId + 1;
        _db.Residents.Add(resident);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Resident resident, CancellationToken cancellationToken)
    {
        if (id != resident.ResidentId)
            return BadRequest();

        var existing = await _db.Residents.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(resident);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.Residents.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Residents.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
