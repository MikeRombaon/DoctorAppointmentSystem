using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// Represents a single finding on a specific tooth and surface.
/// FDI notation is stored internally (11-48 for permanent, 51-85 for primary).
/// </summary>
public class OdontogramFinding
{
    public int Id { get; set; }

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    /// <summary>Appointment during which this finding was recorded. Null for historical/imported records.</summary>
    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    /// <summary>Recorded by which user (dentist/hygienist).</summary>
    public int RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;

    /// <summary>FDI tooth number (e.g. 11, 21, 36). 0 = full-mouth/unspecified.</summary>
    public int ToothFdi { get; set; }

    public ToothSurface Surface { get; set; } = ToothSurface.None;

    public FindingType FindingType { get; set; }

    /// <summary>Free-text detail for the finding (e.g. material type, shade).</summary>
    public string? Notes { get; set; }

    /// <summary>Whether this finding is still current (false = resolved/historical).</summary>
    public bool IsActive { get; set; } = true;
    public int TenantId { get; set; }
    public DateTime RecordedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedDate { get; set; }
}
