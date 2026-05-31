using Microsoft.AspNetCore.Authorization;

namespace DoctorAppointmentSystem.API.Authorization;

/// <summary>
/// Authorization policies for 5-role multi-tenant structure
/// - SuperAdmin: Cross-tenant access — manages tenants and global configuration
/// - Admin: Full access within own tenant + accounting/billing
/// - ClinicalStaff: Medical/treatment operations
/// - SupportStaff: Administrative and scheduling support
/// - Patient: Patient portal access (view own records, schedule appointments)
/// </summary>
public static class Policies
{
    // Role-based policies
    public const string SuperAdminOnly = "SuperAdminOnly";
    public const string AdminOnly = "AdminOnly";
    public const string ClinicalStaffOnly = "ClinicalStaffOnly";
    public const string SupportStaffOnly = "SupportStaffOnly";
    public const string PatientOnly = "PatientOnly";

    // Multi-tenant management
    public const string CanManageTenants = "CanManageTenants";

    // Workflow-based policies (multiple roles can access)
    public const string CanManagePatients = "CanManagePatients";
    public const string CanScheduleAppointments = "CanScheduleAppointments";
    public const string CanPerformTreatments = "CanPerformTreatments";
    public const string CanManageInventory = "CanManageInventory";
    public const string CanProcessBilling = "CanProcessBilling";
    public const string CanViewReports = "CanViewReports";
    public const string CanManageUsers = "CanManageUsers";

    // Patient Portal specific
    public const string CanViewOwnRecords = "CanViewOwnRecords";
    public const string CanScheduleOwnAppointments = "CanScheduleOwnAppointments";
    public const string CanViewOwnInvoices = "CanViewOwnInvoices";

    public static void AddPolicies(AuthorizationOptions options)
    {
        // Role-based policies
        options.AddPolicy(SuperAdminOnly, policy => policy.RequireRole("SuperAdmin"));
        options.AddPolicy(AdminOnly, policy => policy.RequireRole("SuperAdmin", "Admin"));
        options.AddPolicy(ClinicalStaffOnly, policy => policy.RequireRole("SuperAdmin", "ClinicalStaff"));
        options.AddPolicy(SupportStaffOnly, policy => policy.RequireRole("SuperAdmin", "SupportStaff"));
        options.AddPolicy(PatientOnly, policy => policy.RequireRole("SuperAdmin", "Patient"));

        // Multi-tenant management — SuperAdmin only
        options.AddPolicy(CanManageTenants, policy => policy.RequireRole("SuperAdmin"));

        // Workflow-based policies (staff only)

        // Patient Management - Admin, SupportStaff (receptionists), ClinicalStaff
        options.AddPolicy(CanManagePatients, policy =>
            policy.RequireRole("SuperAdmin", "Admin", "SupportStaff", "ClinicalStaff"));

        // Appointment Scheduling - Admin, SupportStaff (receptionists), ClinicalStaff
        options.AddPolicy(CanScheduleAppointments, policy =>
            policy.RequireRole("SuperAdmin", "Admin", "SupportStaff", "ClinicalStaff"));

        // Treatment Execution - ClinicalStaff (dentists/hygienists), Admin
        options.AddPolicy(CanPerformTreatments, policy =>
            policy.RequireRole("SuperAdmin", "Admin", "ClinicalStaff"));

        // Inventory Management - Admin, SupportStaff (inventory managers), ClinicalStaff
        options.AddPolicy(CanManageInventory, policy =>
            policy.RequireRole("SuperAdmin", "Admin", "SupportStaff", "ClinicalStaff"));

        // Billing & Payment - Admin (includes accounting)
        options.AddPolicy(CanProcessBilling, policy =>
            policy.RequireRole("SuperAdmin", "Admin"));

        // Reports - All staff can view (not patients)
        options.AddPolicy(CanViewReports, policy =>
            policy.RequireRole("SuperAdmin", "Admin", "ClinicalStaff", "SupportStaff"));

        // User Management - Admin only
        options.AddPolicy(CanManageUsers, policy =>
            policy.RequireRole("SuperAdmin", "Admin"));

        // Patient Portal Policies - Patients can view their own data
        options.AddPolicy(CanViewOwnRecords, policy =>
            policy.RequireRole("Patient", "SuperAdmin", "Admin", "ClinicalStaff"));

        options.AddPolicy(CanScheduleOwnAppointments, policy =>
            policy.RequireRole("Patient", "SuperAdmin", "Admin", "SupportStaff"));

        options.AddPolicy(CanViewOwnInvoices, policy =>
            policy.RequireRole("Patient", "SuperAdmin", "Admin"));
    }
}

/// <summary>
/// Custom requirements for more complex authorization scenarios
/// </summary>
public class OwnDataRequirement : IAuthorizationRequirement
{
    // Can be used to ensure users can only access their own data
}

public class OwnDataHandler : AuthorizationHandler<OwnDataRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OwnDataRequirement requirement)
    {
        // Implement custom logic to check if user is accessing their own data
        // This is a placeholder for future implementation
        context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
