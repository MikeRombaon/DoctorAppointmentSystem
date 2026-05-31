namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>Weekly recurring availability template for a dentist at a branch.</summary>
public class DentistSchedule
{
    public int Id { get; set; }
    public int DentistId { get; set; }
    public int? BranchId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int SlotDurationMinutes { get; set; } = 30;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }

    public int TenantId { get; set; }

    // Navigation
    public User Dentist { get; set; } = null!;
    public Branch? Branch { get; set; }
}
