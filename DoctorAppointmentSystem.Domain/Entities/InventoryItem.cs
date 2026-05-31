using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

public class InventoryItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string SKU { get; set; } = string.Empty;
    public ItemCategory Category { get; set; }
    public string? Manufacturer { get; set; }
    public int QuantityOnHand { get; set; }
    public int MinimumQuantity { get; set; }
    public int ReorderQuantity { get; set; }
    public string Unit { get; set; } = string.Empty; // e.g., "piece", "box", "ml"
    public decimal UnitCost { get; set; }
    public decimal? SellingPrice { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
    public int TenantId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? LastRestockDate { get; set; }

    // Navigation Properties
    public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
    public ICollection<TreatmentInventoryUsage> TreatmentUsages { get; set; } = new List<TreatmentInventoryUsage>();
}
