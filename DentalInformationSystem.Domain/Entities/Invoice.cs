using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Patient Patient { get; set; } = null!;
    public ICollection<InvoiceItem> InvoiceItems { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<InvoiceAdjustment> Adjustments { get; set; } = new List<InvoiceAdjustment>();
    public ICollection<InsuranceClaim> Claims { get; set; } = new List<InsuranceClaim>();
}
