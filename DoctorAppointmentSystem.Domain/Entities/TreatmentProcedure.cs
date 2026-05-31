namespace DoctorAppointmentSystem.Domain.Entities;

public class TreatmentProcedure
{
    public int Id { get; set; }
    public int TreatmentId { get; set; }
    public int ProcedureId { get; set; }

    // Navigation Properties
    public Treatment Treatment { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
}
