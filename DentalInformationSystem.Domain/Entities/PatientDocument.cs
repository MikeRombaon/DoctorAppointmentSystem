namespace DentalInformationSystem.Domain.Entities;

public class PatientDocument
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int UploadedByUserId { get; set; }
    public int? AppointmentId { get; set; }
    public string FileName { get; set; } = string.Empty;        // Original file name shown to users
    public string StoredFileName { get; set; } = string.Empty;  // GUID-based name on disk
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string Category { get; set; } = "General";           // XRay | Photo | Consent | Lab | General
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UploadedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Patient Patient { get; set; } = null!;
    public User UploadedByUser { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}
