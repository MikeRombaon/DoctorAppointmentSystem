using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiagnosesController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly TenantContext _tenantContext;

    public DiagnosesController(IUnitOfWork uow, TenantContext tenantContext)
    {
        _uow = uow;
        _tenantContext = tenantContext;
    }

    // GET api/diagnoses/patient/{patientId}
    [HttpGet("patient/{patientId:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetByPatient(int patientId, [FromQuery] bool includeResolved = true)
    {
        var query = _uow.PatientDiagnoses.GetAll()
            .Where(d => d.PatientId == patientId && d.IsActive);

        if (!includeResolved)
            query = query.Where(d => d.Status != "Resolved" && d.Status != "Ruled Out");

        var diagnoses = await query
            .OrderByDescending(d => d.CreatedDate)
            .Select(d => new
            {
                d.Id,
                d.PatientId,
                d.AppointmentId,
                d.IcdCode,
                d.Description,
                d.Status,
                d.Severity,
                d.OnsetDate,
                d.Notes,
                d.CreatedDate,
                d.UpdatedDate,
                RecordedBy = $"{d.RecordedByUser.FirstName} {d.RecordedByUser.LastName}",
            })
            .ToListAsync();

        return Ok(diagnoses);
    }

    // GET api/diagnoses/{id}
    [HttpGet("{id:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetById(int id)
    {
        var d = await _uow.PatientDiagnoses.GetAll()
            .Where(x => x.Id == id && x.IsActive)
            .Select(d => new
            {
                d.Id,
                d.PatientId,
                d.AppointmentId,
                d.IcdCode,
                d.Description,
                d.Status,
                d.Severity,
                d.OnsetDate,
                d.Notes,
                d.CreatedDate,
                d.UpdatedDate,
                RecordedBy = $"{d.RecordedByUser.FirstName} {d.RecordedByUser.LastName}",
            })
            .FirstOrDefaultAsync();

        if (d is null) return NotFound();
        return Ok(d);
    }

    // POST api/diagnoses
    [HttpPost]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> Create([FromBody] DiagnosisUpsertDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var entity = new PatientDiagnosis
        {
            PatientId         = dto.PatientId,
            AppointmentId     = dto.AppointmentId,
            RecordedByUserId  = GetCurrentUserId() ?? 0,
            IcdCode           = dto.IcdCode?.Trim().ToUpperInvariant(),
            Description       = dto.Description.Trim(),
            Status            = dto.Status ?? "Active",
            Severity          = dto.Severity,
            OnsetDate         = dto.OnsetDate,
            Notes             = dto.Notes,
            TenantId          = _tenantContext.TenantId ?? 0,
        };

        await _uow.PatientDiagnoses.AddAsync(entity);
        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new { entity.Id });
    }

    // PUT api/diagnoses/{id}
    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> Update(int id, [FromBody] DiagnosisUpsertDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var entity = await _uow.PatientDiagnoses.GetByIdAsync(id);
        if (entity is null || !entity.IsActive) return NotFound();

        entity.IcdCode      = dto.IcdCode?.Trim().ToUpperInvariant();
        entity.Description  = dto.Description.Trim();
        entity.Status       = dto.Status ?? entity.Status;
        entity.Severity     = dto.Severity;
        entity.OnsetDate    = dto.OnsetDate;
        entity.Notes        = dto.Notes;
        entity.UpdatedDate  = DateTime.UtcNow;

        _uow.PatientDiagnoses.Update(entity);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // DELETE api/diagnoses/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _uow.PatientDiagnoses.GetByIdAsync(id);
        if (entity is null || !entity.IsActive) return NotFound();

        entity.IsActive    = false;
        entity.UpdatedDate = DateTime.UtcNow;
        _uow.PatientDiagnoses.Update(entity);
        await _uow.SaveChangesAsync();

        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record DiagnosisUpsertDto(
    int PatientId,
    int? AppointmentId,
    string? IcdCode,
    [System.ComponentModel.DataAnnotations.Required]
    string Description,
    string? Status,
    string? Severity,
    DateTime? OnsetDate,
    string? Notes
);
