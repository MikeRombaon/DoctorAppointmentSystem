namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// ICD-10 diagnosis / problem list entry for a patient.
/// </summary>
public class PatientDiagnosis
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public int RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;

    // ── Diagnosis details ────────────────────────────────────────────────────
    public string? IcdCode { get; set; }        // e.g. J06.9, I10, E11
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";     // Active | Chronic | Resolved | Suspected | Ruled Out
    public string? Severity { get; set; }               // Mild | Moderate | Severe | Critical
    public DateTime? OnsetDate { get; set; }
    public string? Notes { get; set; }

    // ── Metadata ─────────────────────────────────────────────────────────────
    public int TenantId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public bool IsActive { get; set; } = true;
}
