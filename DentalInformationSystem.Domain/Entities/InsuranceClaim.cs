using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class InsuranceClaim
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int InvoiceId { get; set; }
    public int InsurancePayerId { get; set; }
    public int? PatientInsuranceId { get; set; }
    public int CreatedByUserId { get; set; }
    public string ClaimNumber { get; set; } = string.Empty;
    public DateTime ServiceDateFrom { get; set; }
    public DateTime ServiceDateTo { get; set; }
    public decimal BilledAmount { get; set; }
    public decimal AllowedAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal AdjustmentAmount { get; set; }
    public decimal PatientResponsibility { get; set; }
    public ClaimStatus Status { get; set; } = ClaimStatus.Draft;
    public DateTime? SubmittedDate { get; set; }
    public DateTime? AdjudicatedDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public string? EobNotes { get; set; }
    public string? DenialReason { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Patient Patient { get; set; } = null!;
    public Invoice Invoice { get; set; } = null!;
    public InsurancePayer InsurancePayer { get; set; } = null!;
    public PatientInsurance? PatientInsurance { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
