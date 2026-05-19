using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class Treatment
{
    public int Id { get; set; }
    public int AppointmentId { get; set; }
    public int? TreatmentPlanId { get; set; }
    public int DentistId { get; set; }
    public int ProcedureId { get; set; }
    public ToothPosition? ToothPosition { get; set; }
    public string? ToothSurface { get; set; }
    public DateTime TreatmentDate { get; set; }
    public TreatmentStatus Status { get; set; } = TreatmentStatus.Planned;
    public decimal Cost { get; set; }
    public string? Notes { get; set; }
    public string? Diagnosis { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Appointment Appointment { get; set; } = null!;
    public TreatmentPlan? TreatmentPlan { get; set; }
    public User Dentist { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
    public ICollection<TreatmentInventoryUsage> InventoryUsages { get; set; } = new List<TreatmentInventoryUsage>();
}
