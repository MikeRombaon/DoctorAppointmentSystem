namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>One-off time-off / blocked slot that overrides the weekly schedule.</summary>
public class ScheduleBlock
{
    public int Id { get; set; }
    public int DentistId { get; set; }
    public int? BranchId { get; set; }
    public DateTime BlockDate { get; set; }
    public TimeSpan? StartTime { get; set; }     // null = all-day block
    public TimeSpan? EndTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool IsAllDay { get; set; } = false;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public int TenantId { get; set; }

    // Navigation
    public User Dentist { get; set; } = null!;
    public Branch? Branch { get; set; }
}
