using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

public class TreatmentPlan
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int DentistId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? StartDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public decimal EstimatedCost { get; set; }
    public TreatmentStatus Status { get; set; } = TreatmentStatus.Planned;
    public string? Notes { get; set; }

    public int TenantId { get; set; }

    // Navigation Properties
    public Patient Patient { get; set; } = null!;
    public User Dentist { get; set; } = null!;
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}
