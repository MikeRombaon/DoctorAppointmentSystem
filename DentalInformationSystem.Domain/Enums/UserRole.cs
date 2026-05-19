namespace DentalInformationSystem.Domain.Enums;

/// <summary>
/// User role structure with 4 roles including patient portal access
/// - Admin: Full system access + accounting/billing
/// - ClinicalStaff: Dentists and dental hygienists (treatment and medical care)
/// - SupportStaff: Receptionists, nurses, and inventory managers (administrative support)
/// - Patient: Patient portal access (view records, schedule appointments, view history)
/// </summary>
public enum UserRole
{
    Admin = 1,
    ClinicalStaff = 2,
    SupportStaff = 3,
    Patient = 4
}
