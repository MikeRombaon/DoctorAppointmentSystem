namespace DoctorAppointmentSystem.Domain.Entities;

public class AppointmentWaitlist
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int? PreferredDentistId { get; set; }
    public int? BranchId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime RequestedDate { get; set; } = DateTime.UtcNow;
    public DateTime? PreferredDateFrom { get; set; }
    public DateTime? PreferredDateTo { get; set; }
    public string? PreferredTimeOfDay { get; set; }  // "Morning", "Afternoon", "Any"
    public bool IsUrgent { get; set; } = false;
    public bool IsScheduled { get; set; } = false;
    public int? ScheduledAppointmentId { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public int TenantId { get; set; }

    public Patient Patient { get; set; } = null!;
    public User? PreferredDentist { get; set; }
    public Branch? Branch { get; set; }
    public Appointment? ScheduledAppointment { get; set; }
}
