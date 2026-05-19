namespace DentalInformationSystem.Domain.Entities;

/// <summary>
/// Tracks scheduled recall / follow-up visits for patients.
/// Drives automated reminders and ensures preventive-care compliance.
/// </summary>
public class PatientRecall
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int CreatedByUserId { get; set; }

    public DateTime DueDate { get; set; }
    public string Reason { get; set; } = "Routine Checkup";   // Routine Checkup | Follow-Up | Treatment Review | Scaling
    public string? Notes { get; set; }

    public bool IsCompleted { get; set; } = false;
    public DateTime? CompletedDate { get; set; }
    public int? CompletedAppointmentId { get; set; }

    public bool ReminderSent { get; set; } = false;
    public DateTime? ReminderSentDate { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Patient Patient { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public Appointment? CompletedAppointment { get; set; }
}
