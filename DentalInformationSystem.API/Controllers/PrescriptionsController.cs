using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)]
public class PrescriptionsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public PrescriptionsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>Get prescriptions for a patient.</summary>
    [HttpGet("patient/{patientId}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetByPatient(int patientId,
        [FromQuery] bool includeVoided = false)
    {
        var query = _unitOfWork.Prescriptions
            .Find(p => p.PatientId == patientId)
            .Include(p => p.PrescribedByUser)
            .AsQueryable();

        if (!includeVoided)
            query = query.Where(p => !p.IsVoided);

        var prescriptions = await query.OrderByDescending(p => p.PrescriptionDate).ToListAsync();

        return Ok(prescriptions.Select(MapToDto));
    }

    /// <summary>Get a single prescription.</summary>
    [HttpGet("{id}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetById(int id)
    {
        var prescription = await _unitOfWork.Prescriptions
            .Find(p => p.Id == id)
            .Include(p => p.PrescribedByUser)
            .Include(p => p.Patient)
            .FirstOrDefaultAsync();

        if (prescription == null)
            return NotFound(new { message = "Prescription not found" });

        return Ok(new
        {
            // Full detail including patient name for print
            prescription.Id,
            prescription.PatientId,
            patientName = prescription.Patient != null
                ? $"{prescription.Patient.FirstName} {prescription.Patient.LastName}" : null,
            prescription.AppointmentId,
            prescription.DrugName,
            prescription.Strength,
            prescription.DosageForm,
            prescription.Dosage,
            prescription.Frequency,
            prescription.Duration,
            prescription.Quantity,
            prescription.Refills,
            prescription.Instructions,
            prescription.Indication,
            prescription.Warnings,
            prescription.PrescriptionDate,
            prescription.IsVoided,
            prescription.VoidReason,
            prescribedBy = prescription.PrescribedByUser != null
                ? $"{prescription.PrescribedByUser.FirstName} {prescription.PrescribedByUser.LastName}" : null,
            prescribedByLicense = prescription.PrescribedByUser?.LicenseNumber
        });
    }

    /// <summary>Create a new prescription.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PrescriptionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        var prescription = new Prescription
        {
            PatientId = request.PatientId,
            PrescribedByUserId = userId.Value,
            AppointmentId = request.AppointmentId,
            DrugName = request.DrugName,
            Strength = request.Strength,
            DosageForm = request.DosageForm,
            Dosage = request.Dosage,
            Frequency = request.Frequency,
            Duration = request.Duration,
            Quantity = request.Quantity,
            Refills = request.Refills,
            Instructions = request.Instructions,
            Indication = request.Indication,
            Warnings = request.Warnings,
            PrescriptionDate = DateTime.UtcNow,
            IsVoided = false
        };

        await _unitOfWork.Prescriptions.AddAsync(prescription);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = prescription.Id },
            new { prescription.Id });
    }

    /// <summary>Void a prescription (cannot delete for audit trail).</summary>
    [HttpPost("{id}/void")]
    public async Task<IActionResult> Void(int id, [FromBody] VoidPrescriptionRequest request)
    {
        var prescription = await _unitOfWork.Prescriptions
            .Find(p => p.Id == id)
            .FirstOrDefaultAsync();

        if (prescription == null)
            return NotFound(new { message = "Prescription not found" });

        if (prescription.IsVoided)
            return BadRequest(new { message = "Prescription is already voided" });

        prescription.IsVoided = true;
        prescription.VoidReason = request.Reason;
        _unitOfWork.Prescriptions.Update(prescription);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Prescription voided" });
    }

    private static object MapToDto(Prescription p) => new
    {
        p.Id,
        p.PatientId,
        p.AppointmentId,
        p.DrugName,
        p.Strength,
        p.DosageForm,
        p.Dosage,
        p.Frequency,
        p.Duration,
        p.Quantity,
        p.Refills,
        p.Instructions,
        p.Indication,
        p.PrescriptionDate,
        p.IsVoided,
        prescribedBy = p.PrescribedByUser != null
            ? $"{p.PrescribedByUser.FirstName} {p.PrescribedByUser.LastName}" : null
    };
}

public record PrescriptionRequest(
    int PatientId,
    int? AppointmentId,
    string DrugName,
    string Strength,
    string DosageForm,
    string Dosage,
    string Frequency,
    string Duration,
    int Quantity,
    int Refills,
    string? Instructions,
    string? Indication,
    string? Warnings);

public record VoidPrescriptionRequest(string Reason);
