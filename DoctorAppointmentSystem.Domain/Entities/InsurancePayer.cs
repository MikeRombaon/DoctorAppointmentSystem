namespace DoctorAppointmentSystem.Domain.Entities;

public class InsurancePayer
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PayerCode { get; set; }
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Website { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<PatientInsurance> PatientInsurances { get; set; } = new List<PatientInsurance>();
    public ICollection<InsuranceClaim> Claims { get; set; } = new List<InsuranceClaim>();
}
