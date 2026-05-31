using DoctorAppointmentSystem.Data;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Services;

/// <summary>
/// Hosted background service that runs once per day at 08:00 UTC.
/// 
/// Rules enforced:
///   1. 14 days before SubscriptionExpiresAt  → send warning email (once).
///   2. On/after SubscriptionExpiresAt        → send expired email (once) and deactivate tenant.
/// </summary>
public class SubscriptionNotificationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionNotificationService> _logger;

    // Run daily; first fire is delayed to the next 08:00 UTC.
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);

    public SubscriptionNotificationService(
        IServiceScopeFactory scopeFactory,
        ILogger<SubscriptionNotificationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Delay until the next 08:00 UTC so reminders arrive at a predictable time.
        var now = DateTime.UtcNow;
        var nextRun = now.Date.AddHours(8);
        if (nextRun <= now) nextRun = nextRun.AddDays(1);
        var initialDelay = nextRun - now;

        _logger.LogInformation(
            "SubscriptionNotificationService will start at {NextRun} UTC (in {Delay})",
            nextRun, initialDelay);

        await Task.Delay(initialDelay, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunChecksAsync(stoppingToken);
            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task RunChecksAsync(CancellationToken ct)
    {
        _logger.LogInformation("SubscriptionNotificationService: running daily subscription checks.");

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db    = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var email = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var utcNow       = DateTime.UtcNow;
            var warningCutoff = utcNow.AddDays(14);  // warn when ≤ 14 days remain

            // Load all tenants that have an expiry date and are still marked active.
            var tenants = await db.Tenants
                .Where(t => t.SubscriptionExpiresAt != null)
                .ToListAsync(ct);

            foreach (var tenant in tenants)
            {
                if (tenant.ContactEmail == null) continue;
                var expires = tenant.SubscriptionExpiresAt!.Value;

                // ── Expired: past expiry date ─────────────────────────────────
                if (expires <= utcNow)
                {
                    if (!tenant.ExpiryNotificationSent)
                    {
                        await email.SendSubscriptionExpiredAsync(tenant.ContactEmail, tenant.Name);
                        tenant.ExpiryNotificationSent = true;
                        _logger.LogWarning("Subscription EXPIRED for tenant {Name} ({Id})", tenant.Name, tenant.Id);
                    }

                    // Deactivate the tenant so login is also blocked by the IsActive check.
                    if (tenant.IsActive)
                    {
                        tenant.IsActive = false;
                        _logger.LogWarning("Tenant {Name} ({Id}) deactivated due to expired subscription.", tenant.Name, tenant.Id);
                    }

                    continue;
                }

                // ── Expiring soon: within the 14-day warning window ───────────
                if (expires <= warningCutoff && !tenant.ExpiryWarningSent)
                {
                    var daysLeft = (int)Math.Ceiling((expires - utcNow).TotalDays);
                    await email.SendSubscriptionExpiryWarningAsync(
                        tenant.ContactEmail, tenant.Name, expires, daysLeft);
                    tenant.ExpiryWarningSent = true;
                    _logger.LogInformation(
                        "Expiry warning sent for tenant {Name} ({Id}) — {DaysLeft} days left.",
                        tenant.Name, tenant.Id, daysLeft);
                }
            }

            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "SubscriptionNotificationService encountered an error during daily checks.");
        }
    }
}
