namespace DentalInformationSystem.Domain.Entities;

public class PatientInsurance
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int InsurancePayerId { get; set; }
    public string MemberNumber { get; set; } = string.Empty;
    public string? GroupNumber { get; set; }
    public string? PlanName { get; set; }
    public DateTime? EffectiveDate { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public decimal? AnnualMaximum { get; set; }
    public decimal? Deductible { get; set; }
    public decimal? DeductibleMet { get; set; }
    public decimal? AnnualUsed { get; set; }
    public int? CoveragePercentPreventive { get; set; }
    public int? CoveragePercentBasic { get; set; }
    public int? CoveragePercentMajor { get; set; }
    public bool IsPrimary { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Patient Patient { get; set; } = null!;
    public InsurancePayer InsurancePayer { get; set; } = null!;
}
