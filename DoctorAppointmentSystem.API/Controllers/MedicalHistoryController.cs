using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

// ── Request DTO (avoids binding to EF entity with required navigation properties) ──
public class MedicalHistoryDto
{
    public int PatientId { get; set; }
    // Conditions
    public bool HasHeartDisease { get; set; }
    public bool HasDiabetes { get; set; }
    public bool HasHypertension { get; set; }
    public bool HasAsthma { get; set; }
    public bool HasBleedingDisorder { get; set; }
    public bool HasEpilepsy { get; set; }
    public bool HasHIV { get; set; }
    public bool HasHepatitis { get; set; }
    public bool HasOsteoporosis { get; set; }
    public bool IsPregnant { get; set; }
    public string? OtherConditions { get; set; }
    // Allergies
    public bool AllergyToPenicillin { get; set; }
    public bool AllergyToAspirin { get; set; }
    public bool AllergyToLatex { get; set; }
    public bool AllergyToAnesthesia { get; set; }
    public string? OtherAllergies { get; set; }
    // Medications & vitals
    public string? CurrentMedications { get; set; }
    public string? BloodPressure { get; set; }
    public int? PulseRate { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    // Dental history
    public bool HasAnxiety { get; set; }
    public bool HasBadExperience { get; set; }
    public bool HasBruxism { get; set; }
    public string? PreviousDentalWork { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? ClinicNotes { get; set; }
    // Lifestyle
    public bool IsSmoker { get; set; }
    public bool ConsumesAlcohol { get; set; }
    public string? PatientSignatureData { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManagePatients)]
public class MedicalHistoryController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public MedicalHistoryController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
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
    public async Task<IActionResult> CreateOrReplace([FromBody] MedicalHistoryDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == dto.PatientId))
            return NotFound(new { message = "Patient not found" });

        // Archive existing active records
        var existing = await _unitOfWork.MedicalHistories
            .Find(h => h.PatientId == dto.PatientId && h.IsActive)
            .ToListAsync();

        foreach (var old in existing)
        {
            old.IsActive = false;
            old.UpdatedDate = DateTime.UtcNow;
            _unitOfWork.MedicalHistories.Update(old);
        }

        var entity = MapFromDto(dto);
        entity.RecordedByUserId = userId.Value;
        entity.RecordedDate = DateTime.UtcNow;
        entity.IsActive = true;
        entity.TenantId = _tenantContext.TenantId ?? 0;

        await _unitOfWork.MedicalHistories.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActive), new { patientId = entity.PatientId },
            new { entity.Id, entity.PatientId });
    }

    /// <summary>Update the current active record (minor amendments).</summary>
    [HttpPut("{id}")]
    [Authorize(Policy = Policies.CanPerformTreatments)]
    public async Task<IActionResult> Update(int id, [FromBody] MedicalHistoryDto dto)
    {
        var history = await _unitOfWork.MedicalHistories
            .Find(h => h.Id == id)
            .FirstOrDefaultAsync();

        if (history == null)
            return NotFound(new { message = "Medical history record not found" });

        // Apply DTO fields onto the tracked entity
        ApplyDto(dto, history);
        history.UpdatedDate = DateTime.UtcNow;

        _unitOfWork.MedicalHistories.Update(history);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Medical history updated" });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static MedicalHistory MapFromDto(MedicalHistoryDto dto)
    {
        var e = new MedicalHistory { PatientId = dto.PatientId };
        ApplyDto(dto, e);
        return e;
    }

    private static void ApplyDto(MedicalHistoryDto dto, MedicalHistory e)
    {
        e.PatientId = dto.PatientId;
        e.HasHeartDisease = dto.HasHeartDisease; e.HasDiabetes = dto.HasDiabetes;
        e.HasHypertension = dto.HasHypertension; e.HasAsthma = dto.HasAsthma;
        e.HasBleedingDisorder = dto.HasBleedingDisorder; e.HasEpilepsy = dto.HasEpilepsy;
        e.HasHIV = dto.HasHIV; e.HasHepatitis = dto.HasHepatitis;
        e.HasOsteoporosis = dto.HasOsteoporosis; e.IsPregnant = dto.IsPregnant;
        e.OtherConditions = dto.OtherConditions;
        e.AllergyToPenicillin = dto.AllergyToPenicillin; e.AllergyToAspirin = dto.AllergyToAspirin;
        e.AllergyToLatex = dto.AllergyToLatex; e.AllergyToAnesthesia = dto.AllergyToAnesthesia;
        e.OtherAllergies = dto.OtherAllergies;
        e.CurrentMedications = dto.CurrentMedications;
        e.BloodPressure = dto.BloodPressure; e.PulseRate = dto.PulseRate;
        e.Temperature = dto.Temperature; e.Weight = dto.Weight; e.Height = dto.Height;
        e.HasAnxiety = dto.HasAnxiety; e.HasBadExperience = dto.HasBadExperience;
        e.HasBruxism = dto.HasBruxism; e.PreviousDentalWork = dto.PreviousDentalWork;
        e.ChiefComplaint = dto.ChiefComplaint; e.ClinicNotes = dto.ClinicNotes;
        e.IsSmoker = dto.IsSmoker;
        e.PatientSignatureData = dto.PatientSignatureData;
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
        h.PreviousDentalWork, h.ChiefComplaint, h.ClinicNotes,
        // Lifestyle
        h.IsSmoker, h.ConsumesAlcohol,
        hasSignature = !string.IsNullOrEmpty(h.PatientSignatureData)
    };
}


