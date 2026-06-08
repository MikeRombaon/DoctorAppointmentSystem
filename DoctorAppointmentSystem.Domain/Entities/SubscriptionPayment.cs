using DoctorAppointmentSystem.Domain.Enums;

namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// Records a subscription renewal payment submitted by a tenant admin.
/// SuperAdmin reviews and approves/rejects to extend the tenant subscription.
/// </summary>
public class SubscriptionPayment
{
    public int Id { get; set; }

    // ── Tenant ────────────────────────────────────────────────────────────────
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    // ── Payment Details ───────────────────────────────────────────────────────
    /// <summary>Amount paid by the tenant (e.g. 100.00).</summary>
    public decimal AmountPaid { get; set; }

    /// <summary>Currency code, default PHP.</summary>
    public string Currency { get; set; } = "PHP";

    /// <summary>Reference / transaction number from the bank/GCash/QR receipt.</summary>
    public string? ReferenceNumber { get; set; }

    /// <summary>Payment method description (e.g. "GCash", "BPI Transfer", "QR Ph").</summary>
    public string? PaymentMethod { get; set; }

    /// <summary>Relative path to uploaded proof-of-payment image stored in wwwroot/uploads/payments/.</summary>
    public string? ProofOfPaymentPath { get; set; }

    /// <summary>Optional note from the tenant admin (e.g. "Paying for June 2026").</summary>
    public string? TenantNote { get; set; }

    // ── Dates ─────────────────────────────────────────────────────────────────
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    // ── Review ────────────────────────────────────────────────────────────────
    public SubscriptionPaymentStatus Status { get; set; } = SubscriptionPaymentStatus.Pending;

    /// <summary>Set by SuperAdmin when approving — how many months to extend.</summary>
    public int? ExtensionMonths { get; set; }

    /// <summary>Reason provided by SuperAdmin on rejection.</summary>
    public string? RejectionNote { get; set; }

    /// <summary>UTC timestamp when SuperAdmin reviewed (approved or rejected).</summary>
    public DateTime? ReviewedAt { get; set; }

    /// <summary>SuperAdmin user ID who reviewed the payment.</summary>
    public int? ReviewedByUserId { get; set; }
}
