namespace DentalInformationSystem.Domain.Entities;

/// <summary>
/// A prescription written by a dentist for a patient.
/// </summary>
public class Prescription
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int PrescribedByUserId { get; set; }
    public User PrescribedByUser { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    // ── Drug Details ─────────────────────────────────────────────────────────
    public string DrugName { get; set; } = string.Empty;
    public string Strength { get; set; } = string.Empty;      // e.g. "500 mg"
    public string DosageForm { get; set; } = string.Empty;    // e.g. "Tablet", "Capsule", "Syrup"
    public string Dosage { get; set; } = string.Empty;        // e.g. "1 tablet"
    public string Frequency { get; set; } = string.Empty;     // e.g. "TID", "BID", "OD"
    public string Duration { get; set; } = string.Empty;      // e.g. "5 days", "until finished"
    public int Quantity { get; set; }
    public int Refills { get; set; }
    public string? Instructions { get; set; }                 // Patient instructions (sig)
    public string? Indication { get; set; }                   // Reason for prescription
    public string? Warnings { get; set; }                     // Drug interaction notes

    // ── Metadata ─────────────────────────────────────────────────────────────
    public DateTime PrescriptionDate { get; set; } = DateTime.UtcNow;
    public bool IsVoided { get; set; }
    public string? VoidReason { get; set; }
}
