using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class LabOrder
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public int? TreatmentId { get; set; }
    public int OrderedByDentistId { get; set; }
    public int? BranchId { get; set; }
    public string LabName { get; set; } = string.Empty;
    public string WorkType { get; set; } = string.Empty;   // e.g. "Crown", "Bridge", "Denture"
    public string? ToothNumbers { get; set; }
    public string? Shade { get; set; }
    public string? Instructions { get; set; }
    public LabOrderStatus Status { get; set; } = LabOrderStatus.Ordered;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public decimal? EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }

    // Navigation
    public Patient Patient { get; set; } = null!;
    public Treatment? Treatment { get; set; }
    public User OrderedByDentist { get; set; } = null!;
    public Branch? Branch { get; set; }
}
