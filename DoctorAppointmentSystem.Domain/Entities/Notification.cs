namespace DoctorAppointmentSystem.Domain.Entities;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "Info"; // Info, Warning, Success, Error
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ReadDate { get; set; }
    public int TenantId { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
