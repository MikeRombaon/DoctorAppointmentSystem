using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

public class DentalRecord
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public ToothPosition ToothPosition { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime RecordDate { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; } = false;
    public int TenantId { get; set; }

    // Navigation Properties
    public Patient Patient { get; set; } = null!;
}
