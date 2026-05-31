namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// Singleton clinic configuration — always Id = 1.
/// Stores operating hours, contact info, and appointment slot settings.
/// </summary>
public class ClinicSettings
{
    public int Id { get; set; }

    // Clinic Identity
    public string ClinicName { get; set; } = "Dental Clinic";
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? TaxId { get; set; }

    // Appointment defaults
    public int DefaultAppointmentDurationMinutes { get; set; } = 30;
    public int SlotIntervalMinutes { get; set; } = 15;

    // Working hours (JSON: [{DayOfWeek, OpenTime, CloseTime, IsClosed}])
    public string? WorkingHoursJson { get; set; }

    // Notification settings
    public int ReminderDaysBeforeAppointment { get; set; } = 1;
    public int RecallIntervalMonths { get; set; } = 6;

    // Currency / locale
    public string CurrencySymbol { get; set; } = "₱";
    public string TimeZone { get; set; } = "Asia/Manila";
    public int TenantId { get; set; }
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;
}
