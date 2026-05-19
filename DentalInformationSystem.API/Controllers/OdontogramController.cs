using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Domain.Enums;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)]
public class OdontogramController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public OdontogramController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>Get all active odontogram findings for a patient.</summary>
    [HttpGet("patient/{patientId}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetByPatient(int patientId, [FromQuery] bool includeInactive = false)
    {
        var query = _unitOfWork.OdontogramFindings
            .Find(f => f.PatientId == patientId)
            .Include(f => f.RecordedByUser)
            .Include(f => f.Appointment)
            .AsQueryable();

        if (!includeInactive)
            query = query.Where(f => f.IsActive);

        var findings = await query.OrderByDescending(f => f.RecordedDate).ToListAsync();

        return Ok(findings.Select(f => new
        {
            f.Id,
            f.PatientId,
            f.AppointmentId,
            f.ToothFdi,
            f.Surface,
            surfaceName = f.Surface.ToString(),
            f.FindingType,
            findingTypeName = f.FindingType.ToString(),
            f.Notes,
            f.IsActive,
            f.RecordedDate,
            f.ResolvedDate,
            recordedBy = f.RecordedByUser != null ? $"{f.RecordedByUser.FirstName} {f.RecordedByUser.LastName}" : null
        }));
    }

    /// <summary>Add a finding to the odontogram.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOdontogramFindingRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        // Validate patient exists
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        var finding = new OdontogramFinding
        {
            PatientId = request.PatientId,
            AppointmentId = request.AppointmentId,
            RecordedByUserId = userId.Value,
            ToothFdi = request.ToothFdi,
            Surface = request.Surface,
            FindingType = request.FindingType,
            Notes = request.Notes,
            IsActive = true,
            RecordedDate = DateTime.UtcNow
        };

        await _unitOfWork.OdontogramFindings.AddAsync(finding);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByPatient), new { patientId = finding.PatientId },
            new { finding.Id, finding.ToothFdi, finding.Surface, finding.FindingType });
    }

    /// <summary>Update a finding (e.g. change status, add notes).</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOdontogramFindingRequest request)
    {
        var finding = await _unitOfWork.OdontogramFindings
            .Find(f => f.Id == id)
            .FirstOrDefaultAsync();

        if (finding == null)
            return NotFound(new { message = "Finding not found" });

        finding.FindingType = request.FindingType;
        finding.Surface = request.Surface;
        finding.Notes = request.Notes;
        finding.IsActive = request.IsActive;
        finding.ResolvedDate = request.IsActive ? null : DateTime.UtcNow;

        _unitOfWork.OdontogramFindings.Update(finding);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Finding updated", finding.Id });
    }

    /// <summary>Soft-resolve (deactivate) a finding.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Resolve(int id)
    {
        var finding = await _unitOfWork.OdontogramFindings
            .Find(f => f.Id == id)
            .FirstOrDefaultAsync();

        if (finding == null)
            return NotFound(new { message = "Finding not found" });

        finding.IsActive = false;
        finding.ResolvedDate = DateTime.UtcNow;
        _unitOfWork.OdontogramFindings.Update(finding);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Finding resolved" });
    }
}

public record CreateOdontogramFindingRequest(
    int PatientId,
    int? AppointmentId,
    int ToothFdi,
    ToothSurface Surface,
    FindingType FindingType,
    string? Notes);

public record UpdateOdontogramFindingRequest(
    FindingType FindingType,
    ToothSurface Surface,
    string? Notes,
    bool IsActive);
