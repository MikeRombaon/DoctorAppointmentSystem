namespace DoctorAppointmentSystem.Domain.Entities;

public class PrescriptionItem
{
    public int Id { get; set; }
    public int PrescriptionId { get; set; }

    public string DrugName { get; set; } = string.Empty;
    public string Strength { get; set; } = string.Empty;
    public string DosageForm { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int Refills { get; set; }
    public string? Instructions { get; set; }
    public string? Indication { get; set; }
    public string? Warnings { get; set; }

    // Navigation
    public Prescription Prescription { get; set; } = null!;
}
