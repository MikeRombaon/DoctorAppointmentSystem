using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class TreatmentEstimate
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int? TreatmentPlanId { get; set; }
    public int CreatedByUserId { get; set; }
    public string EstimateNumber { get; set; } = string.Empty;
    public DateTime EstimateDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpirationDate { get; set; }
    public decimal TotalFee { get; set; }
    public decimal InsuranceEstimate { get; set; }
    public decimal PatientPortion { get; set; }
    public decimal Discount { get; set; }
    public EstimateStatus Status { get; set; } = EstimateStatus.Draft;
    public string? Notes { get; set; }
    public DateTime? PresentedDate { get; set; }
    public DateTime? AcceptedDate { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Patient Patient { get; set; } = null!;
    public TreatmentPlan? TreatmentPlan { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public ICollection<TreatmentEstimateItem> Items { get; set; } = new List<TreatmentEstimateItem>();
}

public class TreatmentEstimateItem
{
    public int Id { get; set; }
    public int TreatmentEstimateId { get; set; }
    public int ProcedureId { get; set; }
    public string? ToothNumber { get; set; }
    public string? Surface { get; set; }
    public decimal Fee { get; set; }
    public decimal InsuranceEstimate { get; set; }
    public decimal PatientPortion { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public TreatmentEstimate Estimate { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
}
