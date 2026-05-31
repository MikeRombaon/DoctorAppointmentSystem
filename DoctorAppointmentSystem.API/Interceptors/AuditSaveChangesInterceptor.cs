using System.Security.Claims;
using System.Text.Json;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace DoctorAppointmentSystem.API.Interceptors;

/// <summary>
/// EF Core interceptor that automatically writes AuditLog rows for every
/// Add / Modify / Delete on tracked entities, eliminating the need for
/// manual IAuditService.LogAsync calls in CRUD paths.
///
/// Excluded from being audited (to prevent infinite loops or noise):
///   - AuditLog itself
///   - NotificationTemplate  (static reference data)
///   - ReminderLog           (high-frequency, low-value)
/// </summary>
public sealed class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private static readonly HashSet<Type> _excluded = new()
    {
        typeof(AuditLog),
        typeof(NotificationTemplate),
        typeof(ReminderLog)
    };

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly TenantContext _tenantContext;

    public AuditSaveChangesInterceptor(
        IHttpContextAccessor httpContextAccessor,
        TenantContext tenantContext)
    {
        _httpContextAccessor = httpContextAccessor;
        _tenantContext = tenantContext;
    }

    // ── Async path (used by SaveChangesAsync) ────────────────────────────────
    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
            AddAuditEntries(eventData.Context);

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    // ── Sync path (used by SaveChanges) ─────────────────────────────────────
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        if (eventData.Context is not null)
            AddAuditEntries(eventData.Context);

        return base.SavingChanges(eventData, result);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private void AddAuditEntries(DbContext context)
    {
        var http = _httpContextAccessor.HttpContext;
        var user = http?.User;

        int? userId = null;
        if (int.TryParse(user?.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
            userId = uid;

        var userName = user?.FindFirstValue(ClaimTypes.Name);
        var userRole = user?.FindFirstValue(ClaimTypes.Role)
                    ?? user?.FindFirstValue("Role");
        var ip = http?.Connection.RemoteIpAddress?.ToString();
        var ua = http?.Request.Headers["User-Agent"].ToString();
        var now = DateTime.UtcNow;

        var entries = context.ChangeTracker.Entries()
            .Where(e => !_excluded.Contains(e.Entity.GetType())
                     && e.State is EntityState.Added
                                or EntityState.Modified
                                or EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var action = entry.State switch
            {
                EntityState.Added    => "Create",
                EntityState.Modified => "Update",
                EntityState.Deleted  => "Delete",
                _                    => "Unknown"
            };

            string? oldValues = null;
            string? newValues = null;

            if (entry.State == EntityState.Modified)
            {
                oldValues = SerializeOriginal(entry);
                newValues = SerializeCurrent(entry);
            }
            else if (entry.State == EntityState.Deleted)
            {
                oldValues = SerializeCurrent(entry);
            }
            else if (entry.State == EntityState.Added)
            {
                newValues = SerializeCurrent(entry);
            }

            // Derive entity primary key as string (handles composite keys)
            var keyValues = entry.Metadata.FindPrimaryKey()
                ?.Properties
                .Select(p => entry.Property(p.Name).CurrentValue?.ToString())
                .ToArray();
            var entityId = keyValues is { Length: > 0 }
                ? string.Join("|", keyValues!)
                : null;

            // Resolve TenantId — prefer entity property (skip 0 / uninitialised),
            // fall back to TenantContext (null = SuperAdmin cross-tenant action).
            int? tenantId = _tenantContext.TenantId;
            var tenantProp = entry.Properties
                .FirstOrDefault(p => p.Metadata.Name == "TenantId");
            if (tenantProp is not null)
            {
                var val = tenantProp.CurrentValue ?? tenantProp.OriginalValue;
                if (val is int t && t > 0) tenantId = t;
            }

            context.Set<AuditLog>().Add(new AuditLog
            {
                UserId      = userId,
                UserName    = userName,
                UserRole    = userRole,
                TenantId    = tenantId,
                Action      = action,
                EntityType  = entry.Entity.GetType().Name,
                EntityId    = entityId,
                OldValues   = oldValues,
                NewValues   = newValues,
                IpAddress   = ip,
                UserAgent   = ua,
                Success     = true,
                Timestamp   = now
            });
        }
    }

    private static string SerializeCurrent(EntityEntry entry)
    {
        var dict = entry.Properties
            .Where(p => !p.Metadata.IsShadowProperty())
            .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue);
        return JsonSerializer.Serialize(dict);
    }

    private static string SerializeOriginal(EntityEntry entry)
    {
        var dict = entry.Properties
            .Where(p => !p.Metadata.IsShadowProperty())
            .ToDictionary(p => p.Metadata.Name, p => p.OriginalValue);
        return JsonSerializer.Serialize(dict);
    }
}
