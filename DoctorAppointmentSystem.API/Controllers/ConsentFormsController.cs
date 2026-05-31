using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManagePatients)]
public class ConsentFormsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public ConsentFormsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    /// <summary>Get consent forms for a patient.</summary>
    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var forms = await _unitOfWork.ConsentForms
            .Find(f => f.PatientId == patientId)
            .Include(f => f.RequestedByUser)
            .OrderByDescending(f => f.CreatedDate)
            .ToListAsync();

        return Ok(forms.Select(f => new
        {
            f.Id,
            f.PatientId,
            f.AppointmentId,
            f.TemplateTitle,
            f.Status,
            statusName = f.Status.ToString(),
            f.SignedByName,
            f.SignedByRelationship,
            f.SignedDate,
            f.CreatedDate,
            hasSignature = !string.IsNullOrEmpty(f.PatientSignatureData),
            requestedBy = f.RequestedByUser != null
                ? $"{f.RequestedByUser.FirstName} {f.RequestedByUser.LastName}" : null
        }));
    }

    /// <summary>Get a single consent form including full text and signature.</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var form = await _unitOfWork.ConsentForms
            .Find(f => f.Id == id)
            .Include(f => f.RequestedByUser)
            .FirstOrDefaultAsync();

        if (form == null)
            return NotFound(new { message = "Consent form not found" });

        return Ok(new
        {
            form.Id,
            form.PatientId,
            form.AppointmentId,
            form.TemplateTitle,
            form.ConsentText,
            form.Status,
            statusName = form.Status.ToString(),
            form.PatientSignatureData,
            form.SignedByName,
            form.SignedByRelationship,
            form.SignedDate,
            form.CreatedDate,
            requestedBy = form.RequestedByUser != null
                ? $"{form.RequestedByUser.FirstName} {form.RequestedByUser.LastName}" : null
        });
    }

    /// <summary>Create a new consent form for a patient (status = Pending).</summary>
    [HttpPost]
    [Authorize(Policy = Policies.CanPerformTreatments)]
    public async Task<IActionResult> Create([FromBody] CreateConsentFormRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        var form = new ConsentForm
        {
            PatientId = request.PatientId,
            AppointmentId = request.AppointmentId,
            RequestedByUserId = userId.Value,
            TemplateTitle = request.TemplateTitle,
            ConsentText = request.ConsentText,
            Status = ConsentStatus.Pending,
            TenantId = _tenantContext.TenantId ?? 0,
            CreatedDate = DateTime.UtcNow
        };

        await _unitOfWork.ConsentForms.AddAsync(form);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = form.Id }, new { form.Id });
    }

    /// <summary>Submit patient signature and mark the consent form as signed.</summary>
    [HttpPost("{id}/sign")]
    public async Task<IActionResult> Sign(int id, [FromBody] SignConsentRequest request)
    {
        var form = await _unitOfWork.ConsentForms
            .Find(f => f.Id == id)
            .FirstOrDefaultAsync();

        if (form == null)
            return NotFound(new { message = "Consent form not found" });

        if (form.Status == ConsentStatus.Signed)
            return BadRequest(new { message = "Consent form already signed" });

        form.PatientSignatureData = request.SignatureData;
        form.SignedByName = request.SignedByName;
        form.SignedByRelationship = request.SignedByRelationship;
        form.SignedDate = DateTime.UtcNow;
        form.Status = ConsentStatus.Signed;

        _unitOfWork.ConsentForms.Update(form);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Consent form signed", signedDate = form.SignedDate });
    }

    /// <summary>Mark a consent form as declined or revoked.</summary>
    [HttpPatch("{id}/status")]
    [Authorize(Policy = Policies.CanPerformTreatments)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] ConsentStatusUpdateRequest request)
    {
        var form = await _unitOfWork.ConsentForms
            .Find(f => f.Id == id)
            .FirstOrDefaultAsync();

        if (form == null)
            return NotFound(new { message = "Consent form not found" });

        form.Status = request.Status;
        _unitOfWork.ConsentForms.Update(form);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Status updated", form.Status });
    }
}

public record CreateConsentFormRequest(
    int PatientId,
    int? AppointmentId,
    string TemplateTitle,
    string ConsentText);

public record SignConsentRequest(
    string SignatureData,
    string SignedByName,
    string? SignedByRelationship);

public record ConsentStatusUpdateRequest(ConsentStatus Status);
