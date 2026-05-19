using DentalInformationSystem.Domain.Enums;

namespace DentalInformationSystem.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }
    public bool IsActive { get; set; } = true;
    public int? BranchId { get; set; }          // primary / home branch
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginDate { get; set; }

    // Navigation Properties (for staff roles)
    public Branch? Branch { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
    public ICollection<DentistSchedule> DentistSchedules { get; set; } = new List<DentistSchedule>();
    public ICollection<ScheduleBlock> ScheduleBlocks { get; set; } = new List<ScheduleBlock>();

    // Patient Portal Navigation (for patient role)
    public Patient? PatientProfile { get; set; }
}
