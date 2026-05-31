using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)]
public class PrescriptionsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public PrescriptionsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
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
            .Include(p => p.Items)
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
            .Include(p => p.Items)
            .FirstOrDefaultAsync();

        if (prescription == null)
            return NotFound(new { message = "Prescription not found" });

        return Ok(new
        {
            prescription.Id,
            prescription.PatientId,
            patientName = prescription.Patient != null
                ? $"{prescription.Patient.FirstName} {prescription.Patient.LastName}" : null,
            prescription.AppointmentId,
            prescription.Notes,
            prescription.PrescriptionDate,
            prescription.IsVoided,
            prescription.VoidReason,
            prescribedBy = prescription.PrescribedByUser != null
                ? $"{prescription.PrescribedByUser.FirstName} {prescription.PrescribedByUser.LastName}" : null,
            prescribedByLicense = prescription.PrescribedByUser?.LicenseNumber,
            items = prescription.Items.Select(i => new
            {
                i.Id,
                i.DrugName,
                i.Strength,
                i.DosageForm,
                i.Dosage,
                i.Frequency,
                i.Duration,
                i.Quantity,
                i.Refills,
                i.Instructions,
                i.Indication,
                i.Warnings
            })
        });
    }

    /// <summary>Create a new prescription with one or more drug items.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePrescriptionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "At least one drug item is required" });

        var prescription = new Prescription
        {
            PatientId = request.PatientId,
            PrescribedByUserId = userId.Value,
            AppointmentId = request.AppointmentId,
            Notes = request.Notes,
            PrescriptionDate = DateTime.UtcNow,
            IsVoided = false,
            TenantId = _tenantContext.TenantId ?? 0
        };

        await _unitOfWork.Prescriptions.AddAsync(prescription);
        await _unitOfWork.SaveChangesAsync();

        foreach (var item in request.Items)
        {
            await _unitOfWork.PrescriptionItems.AddAsync(new PrescriptionItem
            {
                PrescriptionId = prescription.Id,
                DrugName = item.DrugName,
                Strength = item.Strength ?? string.Empty,
                DosageForm = item.DosageForm ?? string.Empty,
                Dosage = item.Dosage ?? string.Empty,
                Frequency = item.Frequency ?? string.Empty,
                Duration = item.Duration ?? string.Empty,
                Quantity = item.Quantity,
                Refills = item.Refills,
                Instructions = item.Instructions,
                Indication = item.Indication,
                Warnings = item.Warnings
            });
        }
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
        p.Notes,
        p.PrescriptionDate,
        p.IsVoided,
        prescribedBy = p.PrescribedByUser != null
            ? $"{p.PrescribedByUser.FirstName} {p.PrescribedByUser.LastName}" : null,
        prescribedByLicense = p.PrescribedByUser?.LicenseNumber,
        items = p.Items.Select(i => new
        {
            i.Id,
            i.DrugName,
            i.Strength,
            i.DosageForm,
            i.Dosage,
            i.Frequency,
            i.Duration,
            i.Quantity,
            i.Refills,
            i.Instructions,
            i.Indication,
            i.Warnings
        })
    };
}

public record PrescriptionItemRequest(
    string DrugName,
    string? Strength,
    string? DosageForm,
    string? Dosage,
    string? Frequency,
    string? Duration,
    int Quantity,
    int Refills,
    string? Instructions,
    string? Indication,
    string? Warnings
);

public record CreatePrescriptionRequest(
    int PatientId,
    int? AppointmentId,
    string? Notes,
    List<PrescriptionItemRequest> Items
);

public record VoidPrescriptionRequest(string Reason);

