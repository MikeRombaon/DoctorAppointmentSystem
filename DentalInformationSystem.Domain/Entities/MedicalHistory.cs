namespace DentalInformationSystem.Domain.Entities;

/// <summary>
/// Structured medical and dental history intake record for a patient.
/// One active record per patient; previous records are archived (IsActive = false).
/// </summary>
public class MedicalHistory
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    // ── Medical Conditions ──────────────────────────────────────────────────
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

    // ── Allergies ───────────────────────────────────────────────────────────
    public bool AllergyToPenicillin { get; set; }
    public bool AllergyToAspirin { get; set; }
    public bool AllergyToLatex { get; set; }
    public bool AllergyToAnesthesia { get; set; }
    public string? OtherAllergies { get; set; }

    // ── Current Medications ─────────────────────────────────────────────────
    /// <summary>Free-text list of current medications (e.g. "Metformin 500mg OD, Amlodipine 5mg OD").</summary>
    public string? CurrentMedications { get; set; }

    // ── Vitals (taken at intake) ─────────────────────────────────────────────
    public string? BloodPressure { get; set; }   // e.g. "120/80"
    public int? PulseRate { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }

    // ── Dental History ──────────────────────────────────────────────────────
    public bool HasAnxiety { get; set; }
    public bool HasBadExperience { get; set; }
    public bool HasBruxism { get; set; }
    public string? PreviousDentalWork { get; set; }
    public string? ChiefComplaint { get; set; }

    // ── Lifestyle ───────────────────────────────────────────────────────────
    public bool IsSmoker { get; set; }
    public bool ConsumesAlcohol { get; set; }

    // ── Metadata ────────────────────────────────────────────────────────────
    public bool IsActive { get; set; } = true;
    public DateTime RecordedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public int RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;
    public string? PatientSignatureData { get; set; } // base64 PNG of patient signature
}
