using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

public class Patient
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public DateTime DateOfBirth { get; set; }
    public Gender Gender { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? AlternatePhoneNumber { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? State { get; set; }
    public string PostalCode { get; set; } = string.Empty;
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? InsuranceProvider { get; set; }
    public string? InsurancePolicyNumber { get; set; }
    public string? BloodType { get; set; }
    public string? Allergies { get; set; }
    public string? MedicalHistory { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public int TenantId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? LastVisitDate { get; set; }

    // Patient Portal Link (nullable - not all patients may have portal access)
    public int? UserId { get; set; }
    public User? User { get; set; }
    public Tenant Tenant { get; set; } = null!;

    // Navigation Properties
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<TreatmentPlan> TreatmentPlans { get; set; } = new List<TreatmentPlan>();
    public ICollection<DentalRecord> DentalRecords { get; set; } = new List<DentalRecord>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    // Phase 1 - Clinical Core
    public ICollection<OdontogramFinding> OdontogramFindings { get; set; } = new List<OdontogramFinding>();
    public ICollection<PerioExam> PerioExams { get; set; } = new List<PerioExam>();
    public ICollection<MedicalHistory> MedicalHistories { get; set; } = new List<MedicalHistory>();
    public ICollection<ClinicalNote> ClinicalNotes { get; set; } = new List<ClinicalNote>();
    public ICollection<ConsentForm> ConsentForms { get; set; } = new List<ConsentForm>();
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();

    // Phase 2 - Financial
    public ICollection<PatientInsurance> PatientInsurances { get; set; } = new List<PatientInsurance>();
    public ICollection<TreatmentEstimate> TreatmentEstimates { get; set; } = new List<TreatmentEstimate>();
    public ICollection<InsuranceClaim> InsuranceClaims { get; set; } = new List<InsuranceClaim>();

    // Phase 3 - Portal & Documents
    public ICollection<PatientDocument> Documents { get; set; } = new List<PatientDocument>();

    // Phase 4 - Recall
    public ICollection<PatientRecall> Recalls { get; set; } = new List<PatientRecall>();

    // Phase 5 - Lab Orders & Waitlist
    public ICollection<LabOrder> LabOrders { get; set; } = new List<LabOrder>();
    public ICollection<AppointmentWaitlist> WaitlistEntries { get; set; } = new List<AppointmentWaitlist>();
}
