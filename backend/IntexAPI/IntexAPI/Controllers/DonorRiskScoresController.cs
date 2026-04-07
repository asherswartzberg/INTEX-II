using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>ML-generated donor churn risk predictions (read-only).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class DonorRiskScoresController : ControllerBase
{
    private readonly AppDbContext _db;

    public DonorRiskScoresController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DonorRiskScore>>> GetAll(
        CancellationToken cancellationToken)
    {
        try
        {
            var list = await _db.DonorRiskScores
                .AsNoTracking()
                .OrderByDescending(x => x.ChurnRiskScore)
                .ToListAsync(cancellationToken);
            return Ok(list);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { detail = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpGet("{supporterId:long}")]
    public async Task<ActionResult<DonorRiskScore>> GetBySupporter(
        long supporterId,
        CancellationToken cancellationToken)
    {
        try
        {
            var entity = await _db.DonorRiskScores
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.SupporterId == supporterId, cancellationToken);
            return entity is null ? NotFound() : Ok(entity);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { detail = ex.Message, inner = ex.InnerException?.Message });
        }
    }
}
