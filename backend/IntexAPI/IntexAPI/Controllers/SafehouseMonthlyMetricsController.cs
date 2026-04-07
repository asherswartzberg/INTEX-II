using IntexAPI.Data;
using IntexAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class SafehouseMonthlyMetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SafehouseMonthlyMetricsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SafehouseMonthlyMetric>>> GetList(
        [FromQuery] int? safehouseId,
        [FromQuery] DateOnly? monthStart,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Pagination.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var (skip, take) = Pagination.ToSkipTake(page, pageSize);
        var q = _db.SafehouseMonthlyMetrics.AsNoTracking().AsQueryable();
        if (safehouseId is int s)
            q = q.Where(m => m.SafehouseId == s);
        if (monthStart is DateOnly m)
            q = q.Where(x => x.MonthStart == m);

        var list = await q
            .OrderByDescending(x => x.MonthStart)
            .ThenBy(x => x.SafehouseId)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SafehouseMonthlyMetric>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.SafehouseMonthlyMetrics.AsNoTracking()
            .FirstOrDefaultAsync(m => m.MetricId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }
}
