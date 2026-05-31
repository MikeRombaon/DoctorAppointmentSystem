using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// A consent form presented to a patient before a procedure or treatment.
/// Supports pre-defined templates and patient e-signature capture.
/// </summary>
public class ConsentForm
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public int RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    // ── Content ──────────────────────────────────────────────────────────────
    public string TemplateTitle { get; set; } = string.Empty;  // e.g. "Extraction Consent"
    public string ConsentText { get; set; } = string.Empty;    // Full HTML/text body of the consent

    // ── Signature ────────────────────────────────────────────────────────────
    public ConsentStatus Status { get; set; } = ConsentStatus.Pending;

    /// <summary>Base64-encoded PNG of the patient's signature.</summary>
    public string? PatientSignatureData { get; set; }

    /// <summary>Full name of the patient or guardian who signed.</summary>
    public string? SignedByName { get; set; }

    /// <summary>Relationship to patient if signed by guardian (e.g. "Parent", "Spouse").</summary>
    public string? SignedByRelationship { get; set; }

    public DateTime? SignedDate { get; set; }

    // ── Metadata ─────────────────────────────────────────────────────────────
    public int TenantId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
