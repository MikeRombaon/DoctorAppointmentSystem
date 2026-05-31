namespace DoctorAppointmentSystem.Domain.Entities;

public class CommunicationLog
{
    public int Id { get; set; }
    public int? PatientId { get; set; }
    public int? UserId { get; set; }
    public string Channel { get; set; } = "Email"; // Email, SMS (future)
    public string Type { get; set; } = string.Empty; // AppointmentReminder, InvoiceSent, WelcomeEmail, PasswordReset, LowStockAlert, ReminderBatch
    public string Recipient { get; set; } = string.Empty; // email address
    public string Subject { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string Status { get; set; } = "Sent"; // Sent, Failed, Pending
    public string? ErrorMessage { get; set; }
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public DateTime SentDate { get; set; } = DateTime.UtcNow;
    public int? SentByUserId { get; set; }

    public int TenantId { get; set; }

    // Navigation
    public Patient? Patient { get; set; }
    public User? SentByUser { get; set; }
}
