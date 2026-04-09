using IntexAPI.Data;
using IntexAPI.Infrastructure;
using IntexAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class IncidentReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public IncidentReportsController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
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
        var q = from i in _db.IncidentReports.AsNoTracking()
                join r in _db.Residents.AsNoTracking() on i.ResidentId equals r.ResidentId into rj
                from r in rj.DefaultIfEmpty()
                select new { Incident = i, ResidentSafehouseId = r.SafehouseId };

        if (!User.IsInRole(AuthRoles.Admin))
        {
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            q = q.Where(x =>
                (x.Incident.SafehouseId != null && allowed.Contains(x.Incident.SafehouseId.Value)) ||
                (x.ResidentSafehouseId != null && allowed.Contains(x.ResidentSafehouseId.Value)));
        }

        if (residentId is int residentFilter)
            q = q.Where(x => x.Incident.ResidentId == residentFilter);
        if (safehouseId is int safehouseFilter)
            q = q.Where(x => x.Incident.SafehouseId == safehouseFilter || x.ResidentSafehouseId == safehouseFilter);

        var list = await q
            .OrderByDescending(x => x.Incident.IncidentDate)
            .Skip(skip)
            .Take(take)
            .Select(x => x.Incident)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IncidentReport>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.IncidentReports.AsNoTracking()
            .FirstOrDefaultAsync(i => i.IncidentId == id, cancellationToken);
        if (entity is not null && !User.IsInRole(AuthRoles.Admin))
        {
            int? resolvedSafehouseId = entity.SafehouseId;
            if (!resolvedSafehouseId.HasValue && entity.ResidentId.HasValue)
            {
                resolvedSafehouseId = await _db.Residents.AsNoTracking()
                    .Where(r => r.ResidentId == entity.ResidentId)
                    .Select(r => r.SafehouseId)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!resolvedSafehouseId.HasValue || !allowed.Contains(resolvedSafehouseId.Value))
                return NotFound();
        }
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IncidentReport>> Create(
        [FromBody] IncidentReport entity,
        CancellationToken cancellationToken)
    {
        var maxId = await _db.IncidentReports.MaxAsync(e => (int?)e.IncidentId, cancellationToken) ?? 0;
        entity.IncidentId = maxId + 1;
        _db.IncidentReports.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.IncidentId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
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
    [Authorize(Roles = "Admin")]
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
