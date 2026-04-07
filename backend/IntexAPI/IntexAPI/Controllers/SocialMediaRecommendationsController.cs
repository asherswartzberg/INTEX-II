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
        [FromQuery] string? platform,
        [FromQuery] string? postType,
        [FromQuery] string? contentTopic,
        [FromQuery] string? mediaType,
        [FromQuery] string? dayOfWeek,
        [FromQuery] int top = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _db.SocialMediaRecommendations.AsNoTracking();

        if (!string.IsNullOrEmpty(platform))
            query = query.Where(x => x.Platform == platform);
        if (!string.IsNullOrEmpty(postType))
            query = query.Where(x => x.PostType == postType);
        if (!string.IsNullOrEmpty(contentTopic))
            query = query.Where(x => x.ContentTopic == contentTopic);
        if (!string.IsNullOrEmpty(mediaType))
            query = query.Where(x => x.MediaType == mediaType);
        if (!string.IsNullOrEmpty(dayOfWeek))
            query = query.Where(x => x.DayOfWeek == dayOfWeek);

        var list = await query
            .OrderByDescending(x => x.PredictedDonationReferrals)
            .Take(Math.Min(top, 200))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }
}
