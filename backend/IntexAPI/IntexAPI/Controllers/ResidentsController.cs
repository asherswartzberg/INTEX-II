using IntexAPI.Data;
using IntexAPI.Infrastructure;
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
    /// <summary>Caseload UI loads a large slice in one request; higher than global <see cref="Pagination.MaxPageSize"/>.</summary>
    private const int ResidentsListMaxPageSize = 2000;

    private readonly AppDbContext _db;
    private readonly FacilityAccessService _facilityAccess;

    public ResidentsController(AppDbContext db, FacilityAccessService facilityAccess)
    {
        _db = db;
        _facilityAccess = facilityAccess;
    }

    private static string RequireText(string? value, string fallback = "Unknown")
        => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

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
        var p = page < 1 ? 1 : page;
        var take = pageSize < 1 ? Pagination.DefaultPageSize : Math.Min(pageSize, ResidentsListMaxPageSize);
        var skip = (p - 1) * take;
        var q = _db.Residents.AsNoTracking().AsQueryable();
        var allowedSafehouses = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
        if (!User.IsInRole(AuthRoles.Admin))
            q = _facilityAccess.ScopeResidents(q, allowedSafehouses);

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
        if (resident is not null && !User.IsInRole(AuthRoles.Admin))
        {
            var allowedSafehouses = await _facilityAccess.GetAccessibleSafehouseIdsAsync(User, cancellationToken);
            if (!resident.SafehouseId.HasValue || !allowedSafehouses.Contains(resident.SafehouseId.Value))
                return NotFound();
        }
        return resident is null ? NotFound() : Ok(resident);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Resident>> Create([FromBody] Resident resident, CancellationToken cancellationToken)
    {
        // Production schema has many NOT NULL columns; coalesce nulls defensively.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        resident.CaseControlNo = RequireText(resident.CaseControlNo, "Auto-generated");
        resident.InternalCode = RequireText(resident.InternalCode, $"R-{DateTime.UtcNow:yyyyMMddHHmmss}");
        resident.SafehouseId ??= 1;
        resident.CaseStatus = RequireText(resident.CaseStatus, "Active");
        resident.Sex = RequireText(resident.Sex, "F");
        resident.DateOfBirth ??= today;
        resident.BirthStatus = RequireText(resident.BirthStatus, "Unknown");
        resident.PlaceOfBirth = RequireText(resident.PlaceOfBirth, "Unknown");
        resident.Religion = RequireText(resident.Religion, "Unknown");
        resident.CaseCategory = RequireText(resident.CaseCategory, "Unknown");
        resident.SubCatOrphaned ??= false;
        resident.SubCatTrafficked ??= false;
        resident.SubCatChildLabor ??= false;
        resident.SubCatPhysicalAbuse ??= false;
        resident.SubCatSexualAbuse ??= false;
        resident.SubCatOsaec ??= false;
        resident.SubCatCicl ??= false;
        resident.SubCatAtRisk ??= false;
        resident.SubCatStreetChild ??= false;
        resident.SubCatChildWithHiv ??= false;
        resident.IsPwd ??= false;
        resident.HasSpecialNeeds ??= false;
        resident.FamilyIs4ps ??= false;
        resident.FamilySoloParent ??= false;
        resident.FamilyIndigenous ??= false;
        resident.FamilyParentPwd ??= false;
        resident.FamilyInformalSettler ??= false;
        resident.DateOfAdmission ??= today;
        resident.AgeUponAdmission = RequireText(resident.AgeUponAdmission, "Unknown");
        resident.PresentAge = RequireText(resident.PresentAge, "Unknown");
        resident.LengthOfStay = RequireText(resident.LengthOfStay, "Unknown");
        resident.ReferralSource = RequireText(resident.ReferralSource, "Unknown");
        resident.AssignedSocialWorker = RequireText(resident.AssignedSocialWorker, "Unassigned");
        resident.InitialCaseAssessment = RequireText(resident.InitialCaseAssessment, "Unknown");
        resident.ReintegrationType = RequireText(resident.ReintegrationType, "Unknown");
        resident.ReintegrationStatus = RequireText(resident.ReintegrationStatus, "Pending");
        resident.InitialRiskLevel = RequireText(resident.InitialRiskLevel, "Unknown");
        resident.CurrentRiskLevel = RequireText(resident.CurrentRiskLevel, "Unknown");
        resident.DateEnrolled ??= today;
        resident.CreatedAt ??= DateTime.UtcNow;

        // Use nullable MAX (SQL returns NULL on empty table). Avoid DefaultIfEmpty()+Max — poor EF translation on SQL Server.
        var maxNullable = await _db.Residents.AsNoTracking()
            .Select(r => (int?)r.ResidentId)
            .MaxAsync(cancellationToken);
        var maxId = maxNullable ?? 0;
        resident.ResidentId = maxId + 1;
        try
        {
            _db.Residents.Add(resident);
            await _db.SaveChangesAsync(cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new
            {
                message = "Unable to create resident.",
                detail = ex.GetBaseException().Message,
            });
        }
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
