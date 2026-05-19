using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class InvoiceAdjustment
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public int CreatedByUserId { get; set; }
    public AdjustmentType AdjustmentType { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime AdjustmentDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Invoice Invoice { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
