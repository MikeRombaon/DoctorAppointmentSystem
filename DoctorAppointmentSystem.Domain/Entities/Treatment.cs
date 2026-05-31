using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

public class Treatment
{
    public int Id { get; set; }
    public int AppointmentId { get; set; }
    public int? TreatmentPlanId { get; set; }
    public int DentistId { get; set; }
    public int? ProcedureId { get; set; }
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
    public int TenantId { get; set; }

    public TreatmentPlan? TreatmentPlan { get; set; }
    public User Dentist { get; set; } = null!;
    public Procedure? Procedure { get; set; }
    public ICollection<TreatmentProcedure> TreatmentProcedures { get; set; } = new List<TreatmentProcedure>();
    public ICollection<TreatmentInventoryUsage> InventoryUsages { get; set; } = new List<TreatmentInventoryUsage>();
}
