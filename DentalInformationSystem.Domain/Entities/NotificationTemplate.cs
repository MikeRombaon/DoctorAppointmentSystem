namespace DentalInformationSystem.Domain.Entities;

public class NotificationTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;           // AppointmentReminder | InvoiceReady | Welcome | LowStock
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;       // Supports {{PatientName}}, {{Date}}, etc.
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }
}
