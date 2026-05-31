namespace DoctorAppointmentSystem.Domain;

/// <summary>
/// Holds the resolved tenant for the current request.
/// Populated by TenantMiddleware in the API layer.
/// SuperAdmin requests leave TenantId = null (cross-tenant access).
/// </summary>
public class TenantContext
{
    public int? TenantId { get; set; }
    public bool IsSuperAdmin { get; set; }
}
