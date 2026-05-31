namespace DoctorAppointmentSystem.Domain.Entities;

public class ReminderLog
{
    public int Id { get; set; }
    public DateTime ReminderDate { get; set; }
    public int DaysAhead { get; set; } = 1;
    public int AppointmentsFound { get; set; }
    public int RemindersSent { get; set; }
    public int RemindersFailed { get; set; }
    public string Status { get; set; } = "Completed"; // Completed, PartialFailure, Failed
    public string? Notes { get; set; }
    public int TriggeredByUserId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public User TriggeredByUser { get; set; } = null!;
}
