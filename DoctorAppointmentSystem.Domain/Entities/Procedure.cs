namespace DoctorAppointmentSystem.Domain.Entities;

public class Procedure
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DefaultCost { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}
