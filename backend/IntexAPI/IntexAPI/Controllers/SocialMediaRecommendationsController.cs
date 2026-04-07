using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>ML-generated social media posting recommendations (read-only).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SocialMediaRecommendationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SocialMediaRecommendationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SocialMediaRecommendation>>> GetAll(
        CancellationToken cancellationToken)
    {
        var list = await _db.SocialMediaRecommendations
            .AsNoTracking()
            .OrderByDescending(x => x.PredictedDonationReferrals)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }
}
