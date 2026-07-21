namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// A single vital-signs reading for a patient.
/// </summary>
public class PatientVitals
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public int RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;

    // ── Vital signs ──────────────────────────────────────────────────────────
    public decimal? SystolicBP { get; set; }        // mmHg
    public decimal? DiastolicBP { get; set; }       // mmHg
    public decimal? HeartRate { get; set; }         // bpm
    public decimal? Temperature { get; set; }       // °C
    public decimal? Spo2 { get; set; }              // %
    public decimal? RespiratoryRate { get; set; }   // breaths/min
    public decimal? Weight { get; set; }            // kg
    public decimal? Height { get; set; }            // cm
    public decimal? Bmi { get; set; }               // computed or entered

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    // ── Metadata ─────────────────────────────────────────────────────────────
    public int TenantId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
