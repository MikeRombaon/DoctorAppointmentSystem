using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class Payment
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public int? ProcessedByUserId { get; set; }

    // Navigation Properties
    public Invoice Invoice { get; set; } = null!;
    public User? ProcessedBy { get; set; }
}
