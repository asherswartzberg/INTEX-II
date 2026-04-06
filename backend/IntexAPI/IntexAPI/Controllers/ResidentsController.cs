using IntexAPI.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResidentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Resident>>> GetAll(CancellationToken cancellationToken)
    {
        var list = await _db.Residents.AsNoTracking().Take(500).ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Resident>> GetById(int id, CancellationToken cancellationToken)
    {
        var resident = await _db.Residents.AsNoTracking()
            .FirstOrDefaultAsync(r => r.ResidentId == id, cancellationToken);
        if (resident is null)
            return NotFound();
        return Ok(resident);
    }
}
