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
public class VitalsController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly TenantContext _tenantContext;

    public VitalsController(IUnitOfWork uow, TenantContext tenantContext)
    {
        _uow = uow;
        _tenantContext = tenantContext;
    }

    // GET api/vitals/patient/{patientId}
    [HttpGet("patient/{patientId:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var vitals = await _uow.PatientVitals.GetAll()
            .Where(v => v.PatientId == patientId)
            .OrderBy(v => v.RecordedAt)
            .Select(v => new
            {
                v.Id,
                v.PatientId,
                v.AppointmentId,
                v.SystolicBP,
                v.DiastolicBP,
                v.HeartRate,
                v.Temperature,
                v.Spo2,
                v.RespiratoryRate,
                v.Weight,
                v.Height,
                v.Bmi,
                v.RecordedAt,
                v.Notes,
                v.CreatedDate,
                RecordedBy = $"{v.RecordedByUser.FirstName} {v.RecordedByUser.LastName}",
            })
            .ToListAsync();

        return Ok(vitals);
    }

    // GET api/vitals/{id}
    [HttpGet("{id:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetById(int id)
    {
        var v = await _uow.PatientVitals.GetAll()
            .Where(x => x.Id == id)
            .Select(v => new
            {
                v.Id,
                v.PatientId,
                v.AppointmentId,
                v.SystolicBP,
                v.DiastolicBP,
                v.HeartRate,
                v.Temperature,
                v.Spo2,
                v.RespiratoryRate,
                v.Weight,
                v.Height,
                v.Bmi,
                v.RecordedAt,
                v.Notes,
                v.CreatedDate,
                RecordedBy = $"{v.RecordedByUser.FirstName} {v.RecordedByUser.LastName}",
            })
            .FirstOrDefaultAsync();

        if (v is null) return NotFound();
        return Ok(v);
    }

    // POST api/vitals
    [HttpPost]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> Create([FromBody] VitalsUpsertDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var entity = new PatientVitals
        {
            PatientId        = dto.PatientId,
            AppointmentId    = dto.AppointmentId,
            RecordedByUserId = GetCurrentUserId() ?? 0,
            SystolicBP       = dto.SystolicBP,
            DiastolicBP      = dto.DiastolicBP,
            HeartRate        = dto.HeartRate,
            Temperature      = dto.Temperature,
            Spo2             = dto.Spo2,
            RespiratoryRate  = dto.RespiratoryRate,
            Weight           = dto.Weight,
            Height           = dto.Height,
            Bmi              = dto.Bmi,
            RecordedAt       = dto.RecordedAt ?? DateTime.UtcNow,
            Notes            = dto.Notes,
            TenantId         = _tenantContext.TenantId ?? 0,
        };

        await _uow.PatientVitals.AddAsync(entity);
        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new { entity.Id });
    }

    // DELETE api/vitals/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _uow.PatientVitals.GetByIdAsync(id);
        if (entity is null) return NotFound();

        _uow.PatientVitals.Remove(entity);
        await _uow.SaveChangesAsync();

        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record VitalsUpsertDto(
    int PatientId,
    int? AppointmentId,
    decimal? SystolicBP,
    decimal? DiastolicBP,
    decimal? HeartRate,
    decimal? Temperature,
    decimal? Spo2,
    decimal? RespiratoryRate,
    decimal? Weight,
    decimal? Height,
    decimal? Bmi,
    DateTime? RecordedAt,
    string? Notes
);
