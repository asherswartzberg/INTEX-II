using IntexAPI.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

/// <summary>Counseling process recordings per resident (chronological history).</summary>
[ApiController]
[Route("api/[controller]")]
public class ProcessRecordingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProcessRecordingsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProcessRecording>>> GetList(
        [FromQuery] int residentId,
        CancellationToken cancellationToken = default)
    {
        if (residentId <= 0)
            return BadRequest("Query parameter residentId is required.");

        var list = await _db.ProcessRecordings.AsNoTracking()
            .Where(r => r.ResidentId == residentId)
            .OrderBy(r => r.SessionDate)
            .ThenBy(r => r.RecordingId)
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProcessRecording>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.ProcessRecordings.AsNoTracking()
            .FirstOrDefaultAsync(r => r.RecordingId == id, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<ProcessRecording>> Create(
        [FromBody] ProcessRecording entity,
        CancellationToken cancellationToken)
    {
        entity.RecordingId = 0;
        _db.ProcessRecordings.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = entity.RecordingId }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecording entity, CancellationToken cancellationToken)
    {
        if (id != entity.RecordingId)
            return BadRequest();

        var existing = await _db.ProcessRecordings.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.Entry(existing).CurrentValues.SetValues(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await _db.ProcessRecordings.FindAsync(new object[] { id }, cancellationToken);
        if (existing is null)
            return NotFound();

        _db.ProcessRecordings.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
