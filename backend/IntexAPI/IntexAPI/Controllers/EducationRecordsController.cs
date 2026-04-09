using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class EducationRecordsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public EducationRecordsController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken = default)
    {
        var records = await _db.EducationRecords.AsNoTracking().ToListAsync(cancellationToken);

        var enrollmentBreakdown = records
            .GroupBy(e => e.EnrollmentStatus ?? "Unknown")
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var completionBreakdown = records
            .GroupBy(e => e.CompletionStatus ?? "Unknown")
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var withAttendance = records.Where(e => e.AttendanceRate.HasValue).ToList();
        var withProgress = records.Where(e => e.ProgressPercent.HasValue).ToList();

        return Ok(new
        {
            totalRecords = records.Count,
            averageAttendanceRate = withAttendance.Count > 0
                ? Math.Round(withAttendance.Average(e => e.AttendanceRate!.Value), 1)
                : (double?)null,
            averageProgressPercent = withProgress.Count > 0
                ? Math.Round(withProgress.Average(e => e.ProgressPercent!.Value), 1)
                : (double?)null,
            enrollmentBreakdown,
            completionBreakdown,
        });
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EducationRecord>>> GetList(
        [FromQuery] int residentId,
        CancellationToken cancellationToken = default)
    {
        if (residentId <= 0)
            return BadRequest("Query parameter residentId is required.");

        if (!User.IsInRole(AuthRoles.Admin))
        {
            var residentSafehouseId = await _db.Residents.AsNoTracking()
                .Where(r => r.ResidentId == residentId)
                .Select(r => r.SafehouseId)
                .FirstOrDefaultAsync(cancellationToken);
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!residentSafehouseId.HasValue || !allowed.Contains(residentSafehouseId.Value))
                return NotFound();
        }

        var list = await _db.EducationRecords.AsNoTracking()
            .Where(e => e.ResidentId == residentId)
            .OrderBy(e => e.RecordDate)
            .ThenBy(e => e.EducationRecordId)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EducationRecord>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.EducationRecords.AsNoTracking()
            .FirstOrDefaultAsync(e => e.EducationRecordId == id, cancellationToken);
        if (entity is not null && !User.IsInRole(AuthRoles.Admin))
        {
            var residentSafehouseId = await _db.Residents.AsNoTracking()
                .Where(r => r.ResidentId == entity.ResidentId)
                .Select(r => r.SafehouseId)
                .FirstOrDefaultAsync(cancellationToken);
            var allowed = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!residentSafehouseId.HasValue || !allowed.Contains(residentSafehouseId.Value))
                return NotFound();
        }
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<EducationRecord>> Create(
        [FromBody] EducationRecord entity,
        CancellationToken cancellationToken)
    {
        var maxId = await _db.EducationRecords.MaxAsync(e => (int?)e.EducationRecordId, cancellationToken) ?? 0;
        entity.EducationRecordId = maxId + 1;
        _db.EducationRecords.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.EducationRecordId }, entity);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] EducationRecord entity, CancellationToken cancellationToken)
    {
        if (id != entity.EducationRecordId)
            return BadRequest();

        var existing = await _db.EducationRecords.FindAsync(new object[] { id }, cancellationToken);
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
        var existing = await _db.EducationRecords.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.EducationRecords.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
