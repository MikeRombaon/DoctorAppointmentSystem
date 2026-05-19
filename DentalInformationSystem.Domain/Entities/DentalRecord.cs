using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class DentalRecord
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public ToothPosition ToothPosition { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime RecordDate { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; } = false;

    // Navigation Properties
    public Patient Patient { get; set; } = null!;
}
