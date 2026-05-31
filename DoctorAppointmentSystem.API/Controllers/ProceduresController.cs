using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Extensions;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanViewReports)] // All staff
public class ProceduresController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public ProceduresController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var query = _unitOfWork.Procedures.GetAll();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                p.Name.Contains(search) ||
                p.Code.Contains(search) ||
                p.Description.Contains(search));
        }

        query = query.Where(p => p.IsActive)
                     .OrderBy(p => p.Code);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var procedure = await _unitOfWork.Procedures.GetByIdAsync(id);
        if (procedure == null)
            return NotFound(new { message = "Procedure not found" });

        return Ok(procedure);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Procedure procedure)
    {
        if (await _unitOfWork.Procedures.AnyAsync(p => p.Code == procedure.Code))
            return BadRequest(new { message = "Procedure code already exists" });

        procedure.CreatedDate = DateTime.UtcNow;
        await _unitOfWork.Procedures.AddAsync(procedure);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = procedure.Id }, procedure);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Procedure procedure)
    {
        var existing = await _unitOfWork.Procedures.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Procedure not found" });

        if (await _unitOfWork.Procedures.AnyAsync(p => p.Code == procedure.Code && p.Id != id))
            return BadRequest(new { message = "Procedure code already exists" });

        existing.Code = procedure.Code;
        existing.Name = procedure.Name;
        existing.Description = procedure.Description;
        existing.DefaultCost = procedure.DefaultCost;
        existing.EstimatedDurationMinutes = procedure.EstimatedDurationMinutes;
        existing.IsActive = procedure.IsActive;

        _unitOfWork.Procedures.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.CanManageUsers)]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Procedures.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Procedure not found" });

        // Soft delete — keep history intact
        existing.IsActive = false;
        _unitOfWork.Procedures.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/toggle")]
    [Authorize(Policy = Policies.CanManageUsers)]
    public async Task<IActionResult> Toggle(int id)
    {
        var existing = await _unitOfWork.Procedures.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Procedure not found" });

        existing.IsActive = !existing.IsActive;
        _unitOfWork.Procedures.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { existing.Id, existing.IsActive });
    }
}
