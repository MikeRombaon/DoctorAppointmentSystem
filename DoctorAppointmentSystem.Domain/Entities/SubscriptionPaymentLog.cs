namespace DoctorAppointmentSystem.Domain.Entities;

/// <summary>
/// Records every payment attempt made during tenant registration or subscription renewal.
/// Stores only masked card data — no raw PAN ever persisted.
/// </summary>
public class SubscriptionPaymentLog
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>e.g. "Trial", "Monthly", "Annual", "Enterprise"</summary>
    public string Plan { get; set; } = string.Empty;

    /// <summary>Amount charged in the local currency (0 for Trial).</summary>
    public decimal Amount { get; set; }

    /// <summary>ISO 4217 currency code, e.g. "PHP".</summary>
    public string Currency { get; set; } = "PHP";

    /// <summary>Last 4 digits of the card used (empty for free plans).</summary>
    public string CardLast4 { get; set; } = string.Empty;

    /// <summary>Card brand extracted from BIN, e.g. "Visa", "Mastercard".</summary>
    public string CardBrand { get; set; } = string.Empty;

    /// <summary>"Succeeded", "Failed", "Pending"</summary>
    public string Status { get; set; } = "Succeeded";

    /// <summary>Optional reference / transaction ID from the payment gateway.</summary>
    public string? TransactionReference { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tenant? Tenant { get; set; }
}
