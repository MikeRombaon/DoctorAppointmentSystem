namespace DoctorAppointmentSystem.Domain.Enums;

/// <summary>
/// User role structure with 5 roles including SuperAdmin for multi-tenant management
/// - SuperAdmin: Cross-tenant access - manages tenants and global configuration
/// - Admin: Full access within own tenant (clinic) + accounting/billing
/// - ClinicalStaff: Doctors and medical staff (treatment and medical care)
/// - SupportStaff: Receptionists, nurses, and inventory managers (administrative support)
/// - Patient: Patient portal access (view own records, schedule appointments)
/// </summary>
public enum UserRole
{
    SuperAdmin    = 0,
    Admin         = 1,
    ClinicalStaff = 2,
    SupportStaff  = 3,
    Patient       = 4
}
