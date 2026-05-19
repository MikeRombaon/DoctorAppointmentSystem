using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

/// <summary>
/// SOAP progress note for a patient visit.
/// Once signed (Status = Signed), the record is locked (IsLocked = true).
/// Amendments create a new note with AmendedFromId referencing the original.
/// </summary>
public class ClinicalNote
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public int AuthoredByUserId { get; set; }
    public User AuthoredByUser { get; set; } = null!;

    // ── SOAP ─────────────────────────────────────────────────────────────────
    public string? Subjective { get; set; }    // Chief complaint, history of present illness
    public string? Objective { get; set; }     // Clinical findings, vitals
    public string? Assessment { get; set; }    // Diagnosis / clinical impression
    public string? Plan { get; set; }          // Treatment plan, referrals, follow-up

    // ── Status & Locking ────────────────────────────────────────────────────
    public ClinicalNoteStatus Status { get; set; } = ClinicalNoteStatus.Draft;
    public bool IsLocked { get; set; }
    public DateTime? SignedDate { get; set; }

    // ── Amendment chain ─────────────────────────────────────────────────────
    public int? AmendedFromId { get; set; }
    public ClinicalNote? AmendedFrom { get; set; }

    // ── Metadata ────────────────────────────────────────────────────────────
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
}
