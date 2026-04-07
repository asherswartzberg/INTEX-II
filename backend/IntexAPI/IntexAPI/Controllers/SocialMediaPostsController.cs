using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Read-only listing for donation channel / social context (e.g. referral_post_id).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SocialMediaPostsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SocialMediaPostsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SocialMediaPost>>> GetList(
        [FromQuery] string? platform,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Pagination.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var (skip, take) = Pagination.ToSkipTake(page, pageSize);
        var q = _db.SocialMediaPosts.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(platform))
            q = q.Where(p => p.Platform == platform);

        var list = await q
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SocialMediaPost>> GetById(double id, CancellationToken cancellationToken)
    {
        var entity = await _db.SocialMediaPosts.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PostId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }
}
