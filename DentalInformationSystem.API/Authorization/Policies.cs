using Microsoft.AspNetCore.Authorization;

namespace DentalInformationSystem.API.Authorization;

/// <summary>
/// Authorization policies for 4-role structure including patient portal
/// - Admin: Full system access + accounting
/// - ClinicalStaff: Medical/treatment operations
/// - SupportStaff: Administrative and scheduling support
/// - Patient: Patient portal access (view own records, schedule appointments)
/// </summary>
public static class Policies
{
    // Role-based policies
    public const string AdminOnly = "AdminOnly";
    public const string ClinicalStaffOnly = "ClinicalStaffOnly";
    public const string SupportStaffOnly = "SupportStaffOnly";
    public const string PatientOnly = "PatientOnly";

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
        options.AddPolicy(AdminOnly, policy => policy.RequireRole("Admin"));
        options.AddPolicy(ClinicalStaffOnly, policy => policy.RequireRole("ClinicalStaff"));
        options.AddPolicy(SupportStaffOnly, policy => policy.RequireRole("SupportStaff"));
        options.AddPolicy(PatientOnly, policy => policy.RequireRole("Patient"));

        // Workflow-based policies (staff only)

        // Patient Management - Admin, SupportStaff (receptionists), ClinicalStaff
        options.AddPolicy(CanManagePatients, policy =>
            policy.RequireRole("Admin", "SupportStaff", "ClinicalStaff"));

        // Appointment Scheduling - Admin, SupportStaff (receptionists), ClinicalStaff
        options.AddPolicy(CanScheduleAppointments, policy =>
            policy.RequireRole("Admin", "SupportStaff", "ClinicalStaff"));

        // Treatment Execution - ClinicalStaff (dentists/hygienists), Admin
        options.AddPolicy(CanPerformTreatments, policy =>
            policy.RequireRole("Admin", "ClinicalStaff"));

        // Inventory Management - Admin, SupportStaff (inventory managers), ClinicalStaff
        options.AddPolicy(CanManageInventory, policy =>
            policy.RequireRole("Admin", "SupportStaff", "ClinicalStaff"));

        // Billing & Payment - Admin (includes accounting)
        options.AddPolicy(CanProcessBilling, policy =>
            policy.RequireRole("Admin"));

        // Reports - All staff can view (not patients)
        options.AddPolicy(CanViewReports, policy =>
            policy.RequireRole("Admin", "ClinicalStaff", "SupportStaff"));

        // User Management - Admin only
        options.AddPolicy(CanManageUsers, policy =>
            policy.RequireRole("Admin"));

        // Patient Portal Policies - Patients can view their own data
        options.AddPolicy(CanViewOwnRecords, policy =>
            policy.RequireRole("Patient", "Admin", "ClinicalStaff"));

        options.AddPolicy(CanScheduleOwnAppointments, policy =>
            policy.RequireRole("Patient", "Admin", "SupportStaff"));

        options.AddPolicy(CanViewOwnInvoices, policy =>
            policy.RequireRole("Patient", "Admin"));
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
