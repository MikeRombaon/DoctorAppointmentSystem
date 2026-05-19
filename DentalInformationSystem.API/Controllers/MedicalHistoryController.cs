using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManagePatients)]
public class MedicalHistoryController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public MedicalHistoryController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>Get the active medical history for a patient.</summary>
    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetActive(int patientId)
    {
        var history = await _unitOfWork.MedicalHistories
            .Find(h => h.PatientId == patientId && h.IsActive)
            .Include(h => h.RecordedByUser)
            .OrderByDescending(h => h.RecordedDate)
            .FirstOrDefaultAsync();

        if (history == null)
            return Ok(null);

        return Ok(MapToDto(history));
    }

    /// <summary>Get all historical medical history records for a patient.</summary>
    [HttpGet("patient/{patientId}/history")]
    public async Task<IActionResult> GetHistory(int patientId)
    {
        var histories = await _unitOfWork.MedicalHistories
            .Find(h => h.PatientId == patientId)
            .Include(h => h.RecordedByUser)
            .OrderByDescending(h => h.RecordedDate)
            .ToListAsync();

        return Ok(histories.Select(MapToDto));
    }

    /// <summary>Create or replace the active medical history for a patient.</summary>
    [HttpPost]
    [Authorize(Policy = Policies.CanPerformTreatments)]
    public async Task<IActionResult> CreateOrReplace([FromBody] MedicalHistory request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        // Archive existing active records
        var existing = await _unitOfWork.MedicalHistories
            .Find(h => h.PatientId == request.PatientId && h.IsActive)
            .ToListAsync();

        foreach (var old in existing)
        {
            old.IsActive = false;
            old.UpdatedDate = DateTime.UtcNow;
            _unitOfWork.MedicalHistories.Update(old);
        }

        request.Id = 0;
        request.RecordedByUserId = userId.Value;
        request.RecordedDate = DateTime.UtcNow;
        request.IsActive = true;

        await _unitOfWork.MedicalHistories.AddAsync(request);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActive), new { patientId = request.PatientId },
            new { request.Id, request.PatientId });
    }

    /// <summary>Update the current active record (minor amendments).</summary>
    [HttpPut("{id}")]
    [Authorize(Policy = Policies.CanPerformTreatments)]
    public async Task<IActionResult> Update(int id, [FromBody] MedicalHistory request)
    {
        var history = await _unitOfWork.MedicalHistories
            .Find(h => h.Id == id)
            .FirstOrDefaultAsync();

        if (history == null)
            return NotFound(new { message = "Medical history record not found" });

        // Copy all fields (except tracking)
        request.Id = id;
        request.UpdatedDate = DateTime.UtcNow;
        _unitOfWork.MedicalHistories.Update(request);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Medical history updated" });
    }

    private static object MapToDto(MedicalHistory h) => new
    {
        h.Id,
        h.PatientId,
        h.IsActive,
        h.RecordedDate,
        h.UpdatedDate,
        recordedBy = h.RecordedByUser != null
            ? $"{h.RecordedByUser.FirstName} {h.RecordedByUser.LastName}" : null,
        // Medical conditions
        h.HasHeartDisease, h.HasDiabetes, h.HasHypertension, h.HasAsthma,
        h.HasBleedingDisorder, h.HasEpilepsy, h.HasHIV, h.HasHepatitis,
        h.HasOsteoporosis, h.IsPregnant, h.OtherConditions,
        // Allergies
        h.AllergyToPenicillin, h.AllergyToAspirin, h.AllergyToLatex,
        h.AllergyToAnesthesia, h.OtherAllergies,
        // Medications & vitals
        h.CurrentMedications, h.BloodPressure, h.PulseRate,
        h.Temperature, h.Weight, h.Height,
        // Dental history
        h.HasAnxiety, h.HasBadExperience, h.HasBruxism,
        h.PreviousDentalWork, h.ChiefComplaint,
        // Lifestyle
        h.IsSmoker, h.ConsumesAlcohol,
        hasSignature = !string.IsNullOrEmpty(h.PatientSignatureData)
    };
}
