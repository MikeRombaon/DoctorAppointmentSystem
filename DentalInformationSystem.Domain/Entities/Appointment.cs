using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class Appointment
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int DentistId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public bool IsWalkIn { get; set; } = false;
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }
    public int? BranchId { get; set; }
    public string? ChairNumber { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }

    // Navigation Properties
    public Patient Patient { get; set; } = null!;
    public User Dentist { get; set; } = null!;
    public Branch? Branch { get; set; }
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}
