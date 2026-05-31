using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// Represents an isolated clinic/organisation in the multi-tenant system.
/// Every data record belongs to exactly one Tenant except SuperAdmin users
/// and global reference data (Procedures, InsurancePayers, NotificationTemplates).
/// </summary>
public class Tenant
{
    public int Id { get; set; }

    /// <summary>Clinic / organisation display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Short unique slug used in URLs and logs (e.g. "clinic-manila").</summary>
    public string Slug { get; set; } = string.Empty;

    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }

    // ── Subscription ──────────────────────────────────────────────────────────
    /// <summary>"Trial" on sign-up, then "Monthly" (or manually set by SuperAdmin).</summary>
    public string SubscriptionPlan { get; set; } = "Trial";

    /// <summary>When the free trial ends. Set to UtcNow + 14 days on registration.</summary>
    public DateTime? TrialEndsAt { get; set; }

    /// <summary>Monthly subscription price in USD. Default $100.</summary>
    public decimal SubscriptionPrice { get; set; } = 100m;

    /// <summary>Hard expiry: null means no expiry (e.g. internal/lifetime accounts).</summary>
    public DateTime? SubscriptionExpiresAt { get; set; }

    /// <summary>Tracks whether the 14-day expiry-warning email has already been sent.</summary>
    public bool ExpiryWarningSent { get; set; } = false;

    /// <summary>Tracks whether the expiry notification email has already been sent.</summary>
    public bool ExpiryNotificationSent { get; set; } = false;

    /// <summary>Computed helper — never persisted.</summary>
    public SubscriptionStatus SubscriptionStatus =>
        SubscriptionExpiresAt == null              ? SubscriptionStatus.Active
        : SubscriptionExpiresAt < DateTime.UtcNow ? SubscriptionStatus.Expired
        : SubscriptionExpiresAt < DateTime.UtcNow.AddDays(14) ? SubscriptionStatus.ExpiringSoon
        : SubscriptionStatus.Active;

    public string? SubscriptionNotes { get; set; }
}
