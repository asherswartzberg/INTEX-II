using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>ML-generated resident incident risk predictions (read-only).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ResidentRiskScoresController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResidentRiskScoresController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ResidentRiskScore>>> GetAll(
        CancellationToken cancellationToken)
    {
        var list = await _db.ResidentRiskScores
            .AsNoTracking()
            .OrderByDescending(x => x.IncidentRiskScore)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }
}
