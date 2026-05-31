using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Extensions;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)]
public class TreatmentPlansController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public TreatmentPlansController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? patientId = null,
        [FromQuery] TreatmentStatus? status = null)
    {
        IQueryable<TreatmentPlan> query = _unitOfWork.TreatmentPlans.GetAll()
            .Include(tp => tp.Patient)
            .Include(tp => tp.Dentist)
            .Include(tp => tp.Treatments)
                .ThenInclude(t => t.Procedure);

        if (patientId.HasValue)
        {
            query = query.Where(tp => tp.PatientId == patientId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(tp => tp.Status == status.Value);
        }

        query = query.OrderByDescending(tp => tp.CreatedDate);

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
        var treatmentPlan = await _unitOfWork.TreatmentPlans
            .Find(tp => tp.Id == id)
            .Include(tp => tp.Patient)
            .Include(tp => tp.Dentist)
            .Include(tp => tp.Treatments)
                .ThenInclude(t => t.Procedure)
            .FirstOrDefaultAsync();

        if (treatmentPlan == null)
            return NotFound(new { message = "Treatment plan not found" });

        return Ok(treatmentPlan);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TreatmentPlan treatmentPlan)
    {
        // Validate patient exists
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == treatmentPlan.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        // Validate doctor exists
        if (!await _unitOfWork.Users.AnyAsync(u => u.Id == treatmentPlan.DentistId))
            return BadRequest(new { message = "Invalid doctor ID" });

        treatmentPlan.CreatedDate = DateTime.UtcNow;
        treatmentPlan.Status = TreatmentStatus.Planned;
        treatmentPlan.TenantId = _tenantContext.TenantId ?? 0;

        await _unitOfWork.TreatmentPlans.AddAsync(treatmentPlan);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = treatmentPlan.Id }, treatmentPlan);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] TreatmentPlan treatmentPlan)
    {
        var existing = await _unitOfWork.TreatmentPlans.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Treatment plan not found" });

        existing.Title = treatmentPlan.Title;
        existing.Description = treatmentPlan.Description;
        existing.EstimatedCost = treatmentPlan.EstimatedCost;
        existing.Status = treatmentPlan.Status;
        existing.Notes = treatmentPlan.Notes;
        existing.StartDate = treatmentPlan.StartDate;
        existing.CompletedDate = treatmentPlan.CompletedDate;

        _unitOfWork.TreatmentPlans.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] TreatmentStatus status)
    {
        var treatmentPlan = await _unitOfWork.TreatmentPlans.GetByIdAsync(id);
        if (treatmentPlan == null)
            return NotFound(new { message = "Treatment plan not found" });

        treatmentPlan.Status = status;

        if (status == TreatmentStatus.Completed)
        {
            treatmentPlan.CompletedDate = DateTime.UtcNow;
        }

        _unitOfWork.TreatmentPlans.Update(treatmentPlan);
        await _unitOfWork.SaveChangesAsync();

        return Ok(treatmentPlan);
    }

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var treatmentPlans = await _unitOfWork.TreatmentPlans
            .Find(tp => tp.PatientId == patientId)
            .Include(tp => tp.Dentist)
            .Include(tp => tp.Treatments)
                .ThenInclude(t => t.Procedure)
            .OrderByDescending(tp => tp.CreatedDate)
            .ToListAsync();

        return Ok(treatmentPlans);
    }

    [HttpGet("{id}/summary")]
    public async Task<IActionResult> GetSummary(int id)
    {
        var treatmentPlan = await _unitOfWork.TreatmentPlans
            .Find(tp => tp.Id == id)
            .Include(tp => tp.Patient)
            .Include(tp => tp.Dentist)
            .Include(tp => tp.Treatments)
                .ThenInclude(t => t.Procedure)
            .FirstOrDefaultAsync();

        if (treatmentPlan == null)
            return NotFound(new { message = "Treatment plan not found" });

        var summary = new
        {
            treatmentPlan.Id,
            treatmentPlan.Title,
            treatmentPlan.Status,
            Patient = new { treatmentPlan.Patient.Id, treatmentPlan.Patient.FullName },
            Dentist = new { treatmentPlan.Dentist.Id, treatmentPlan.Dentist.FullName },
            TotalTreatments = treatmentPlan.Treatments.Count,
            CompletedTreatments = treatmentPlan.Treatments.Count(t => t.Status == TreatmentStatus.Completed),
            EstimatedCost = treatmentPlan.EstimatedCost,
            ActualCost = treatmentPlan.Treatments.Sum(t => t.Cost),
            CreatedDate = treatmentPlan.CreatedDate,
            CompletedDate = treatmentPlan.CompletedDate
        };

        return Ok(summary);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var treatmentPlan = await _unitOfWork.TreatmentPlans
            .Find(tp => tp.Id == id)
            .Include(tp => tp.Treatments)
            .FirstOrDefaultAsync();

        if (treatmentPlan == null)
            return NotFound(new { message = "Treatment plan not found" });

        // Check if there are any completed treatments
        if (treatmentPlan.Treatments.Any(t => t.Status == TreatmentStatus.Completed))
            return BadRequest(new { message = "Cannot delete treatment plan with completed treatments" });

        _unitOfWork.TreatmentPlans.Remove(treatmentPlan);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }
}
