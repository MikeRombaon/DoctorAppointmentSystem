using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

public class DiagnosticRequest
{
    public int Id { get; set; }
    public string RequestNumber { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public int OrderedByDoctorId { get; set; }
    public int? AppointmentId { get; set; }

    /// <summary>Blood Chemistry, CBC, Urinalysis, ECG, X-Ray, 2D Echo, CT Scan, MRI, Ultrasound, Other</summary>
    public string TestType { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;

    /// <summary>Routine, Urgent, Stat</summary>
    public string Urgency { get; set; } = "Routine";
    public string? ClinicalIndication { get; set; }
    public string? SpecialInstructions { get; set; }

    public DiagnosticRequestStatus Status { get; set; } = DiagnosticRequestStatus.Pending;

    public string? ResultsSummary { get; set; }
    public DateTime? ResultDate { get; set; }
    public string? PerformedByLab { get; set; }
    public string? Notes { get; set; }

    public DateTime RequestDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }
    public int TenantId { get; set; }

    // Navigation Properties
    public Patient Patient { get; set; } = null!;
    public User OrderedByDoctor { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}
