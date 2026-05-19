namespace DentalInformationSystem.Domain.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserRole { get; set; }
    public string Action { get; set; } = string.Empty;    // Create | Read | Update | Delete | Login | Export
    public string EntityType { get; set; } = string.Empty; // Patient | Invoice | ClinicalNote | etc.
    public string? EntityId { get; set; }
    public string? OldValues { get; set; }               // JSON snapshot before change
    public string? NewValues { get; set; }               // JSON snapshot after change
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool Success { get; set; } = true;
    public string? FailureReason { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation
    public User? User { get; set; }
}
