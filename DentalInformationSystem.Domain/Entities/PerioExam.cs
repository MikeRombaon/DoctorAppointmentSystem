namespace DentalInformationSystem.Domain.Entities;

/// <summary>
/// A full periodontal examination session for a patient.
/// Each exam contains PerioExamSite records (6 sites per tooth).
/// </summary>
public class PerioExam
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public int ExaminedByUserId { get; set; }
    public User ExaminedByUser { get; set; } = null!;

    public DateTime ExamDate { get; set; } = DateTime.UtcNow;

    public string? ClinicalNotes { get; set; }

    // Navigation: individual site measurements
    public ICollection<PerioExamSite> Sites { get; set; } = new List<PerioExamSite>();
}

/// <summary>
/// One site measurement within a perio exam (MB, B, DB, ML, L, DL).
/// </summary>
public class PerioExamSite
{
    public int Id { get; set; }

    public int PerioExamId { get; set; }
    public PerioExam PerioExam { get; set; } = null!;

    /// <summary>FDI tooth number.</summary>
    public int ToothFdi { get; set; }

    /// <summary>Site code: MB, B, DB, ML, L, DL</summary>
    public string Site { get; set; } = string.Empty;

    /// <summary>Probing depth in mm.</summary>
    public int? ProbingDepth { get; set; }

    /// <summary>Recession in mm (positive = recession, negative = hyperplasia).</summary>
    public int? Recession { get; set; }

    /// <summary>Calculated clinical attachment level = ProbingDepth + Recession.</summary>
    public int? CAL => (ProbingDepth.HasValue && Recession.HasValue) ? ProbingDepth + Recession : null;

    public bool Bleeding { get; set; }
    public bool Suppuration { get; set; }
    public bool Furcation { get; set; }

    /// <summary>Mobility score 0-3.</summary>
    public int? Mobility { get; set; }
}
