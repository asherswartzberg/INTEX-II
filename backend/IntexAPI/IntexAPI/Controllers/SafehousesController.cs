using IntexAPI.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SafehousesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SafehousesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Safehouse>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _db.Safehouses.AsNoTracking().ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Safehouse>> GetById(int id, CancellationToken cancellationToken)
    {
        var safehouse = await _db.Safehouses.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SafehouseId == id, cancellationToken);
        if (safehouse is null)
            return NotFound();
        return Ok(safehouse);
    }
}
