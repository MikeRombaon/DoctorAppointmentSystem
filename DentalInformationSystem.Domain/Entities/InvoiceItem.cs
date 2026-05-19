namespace DentalInformationSystem.Domain.Entities;

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public int? TreatmentId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
    public decimal TotalPrice { get; set; }

    // Navigation Properties
    public Invoice Invoice { get; set; } = null!;
    public Treatment? Treatment { get; set; }
}
