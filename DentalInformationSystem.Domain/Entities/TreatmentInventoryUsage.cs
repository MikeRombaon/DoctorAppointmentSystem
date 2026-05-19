namespace DentalInformationSystem.Domain.Entities;

public class TreatmentInventoryUsage
{
    public int Id { get; set; }
    public int TreatmentId { get; set; }
    public int InventoryItemId { get; set; }
    public int QuantityUsed { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime UsageDate { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Treatment Treatment { get; set; } = null!;
    public InventoryItem InventoryItem { get; set; } = null!;
}
