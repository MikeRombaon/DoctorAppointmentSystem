using System.Security.Claims;
using DoctorAppointmentSystem.Data;
using DoctorAppointmentSystem.Domain;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Middleware;

/// <summary>
/// Resolves the current tenant for every request using a three-stage strategy:
///   1. JWT claim      — primary; used after login (fast, no DB hit).
///   2. X-Tenant-Id header — SuperAdmin override; lets the operator scope to a
///                           specific tenant they are investigating via the UI.
///   3. Subdomain      — fallback; resolves {slug}.host.com before/without a token.
/// Must be placed after UseAuthentication() in the pipeline.
/// </summary>
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext,
        ApplicationDbContext db)
    {
        // ── Stage 1: JWT claim (authenticated requests) ───────────────────────
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value
                         ?? context.User.FindFirst("Role")?.Value;

            tenantContext.IsSuperAdmin = roleClaim == "SuperAdmin";

            if (!tenantContext.IsSuperAdmin)
            {
                var tenantClaim = context.User.FindFirst("TenantId")?.Value;
                if (int.TryParse(tenantClaim, out var tid))
                {
                    tenantContext.TenantId = tid;
                    await _next(context);
                    return;
                }
            }
            else
            {
                // ── Stage 2: X-Tenant-Id header (SuperAdmin tenant selector) ─────────
                // When the SuperAdmin UI operator has chosen a specific tenant to
                // investigate, the frontend injects this header on every request.
                // This scopes backend queries to that tenant without changing the JWT.
                var xTenantHeader = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
                if (int.TryParse(xTenantHeader, out var selectedTenantId))
                {
                    tenantContext.TenantId = selectedTenantId;
                }

                // SuperAdmin continues — no tenant filter if none selected
                await _next(context);
                return;
            }
        }

        // ── Stage 2: Subdomain fallback ───────────────────────────────────────
        // Resolves requests that carry no token (e.g. pre-login, public endpoints)
        // by matching the first host segment against Tenant.Slug.
        // Example: "clinica-verde.myapp.com" → slug = "clinica-verde"
        var host = context.Request.Host.Host; // e.g. "clinica-verde.myapp.com"
        var segments = host.Split('.');
        if (segments.Length >= 2)
        {
            var slug = segments[0].ToLowerInvariant();
            // Skip common non-tenant prefixes
            if (slug is not ("www" or "api" or "localhost"))
            {
                var tenant = await db.Tenants
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive);

                if (tenant is not null)
                    tenantContext.TenantId = tenant.Id;
            }
        }

        await _next(context);
    }
}
