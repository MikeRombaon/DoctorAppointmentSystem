using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Data;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManageTenants)]
public class TenantsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthService _authService;

    public TenantsController(ApplicationDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tenants = await _context.Tenants
            .OrderBy(t => t.Name)
            .Select(t => new
            {
                t.Id, t.Name, t.Slug, t.ContactEmail,
                t.ContactPhone, t.Address, t.City, t.Country,
                t.IsActive, t.CreatedDate,
                t.SubscriptionPlan, t.SubscriptionExpiresAt, t.SubscriptionNotes,
                SubscriptionStatus = t.SubscriptionExpiresAt == null ? "Active"
                    : t.SubscriptionExpiresAt < DateTime.UtcNow ? "Expired"
                    : t.SubscriptionExpiresAt < DateTime.UtcNow.AddDays(14) ? "ExpiringSoon"
                    : "Active"
            })
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var tenant = await _context.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();
        return Ok(tenant);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] TenantRegistrationDto dto)
    {
        if (await _context.Tenants.AnyAsync(t => t.Slug == dto.Slug))
            return Conflict(new { message = "Clinic URL slug is already taken. Please choose another." });

        if (await _context.Users.AnyAsync(u => u.Email == dto.AdminEmail))
            return Conflict(new { message = "An account with that email already exists." });

        // All new registrations start with a 14-day free trial.
        // After the trial the subscription costs $100 USD / month.
        var trialEndsAt = DateTime.UtcNow.AddDays(14);

        var tenant = new Tenant
        {
            Name                  = dto.ClinicName,
            Slug                  = dto.Slug.ToLowerInvariant().Trim(),
            ContactEmail          = dto.AdminEmail,
            ContactPhone          = dto.Phone,
            Address               = dto.Address,
            City                  = dto.City,
            Country               = dto.Country,
            IsActive              = true,
            SubscriptionPlan      = "Trial",
            TrialEndsAt           = trialEndsAt,
            SubscriptionExpiresAt = trialEndsAt,   // trial IS the first expiry window
            SubscriptionPrice     = 100m,
            CreatedDate           = DateTime.UtcNow,
        };

        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();

        var adminUser = new User
        {
            FirstName    = dto.AdminFirstName,
            LastName     = dto.AdminLastName,
            Email        = dto.AdminEmail,
            PasswordHash = _authService.HashPassword(dto.AdminPassword),
            PhoneNumber  = dto.Phone ?? string.Empty,
            Role         = UserRole.Admin,
            TenantId     = tenant.Id,
            IsActive     = true,
            CreatedDate  = DateTime.UtcNow,
        };

        _context.Users.Add(adminUser);

        // Trial registrations are free; log a $0 record for auditability.
        var paymentLog = new SubscriptionPaymentLog
        {
            TenantId             = tenant.Id,
            Plan                 = "Trial",
            Amount               = 0m,
            Currency             = "USD",
            CardLast4            = dto.CardLast4 ?? string.Empty,
            CardBrand            = dto.CardBrand ?? string.Empty,
            Status               = "Trial",
            TransactionReference = dto.TransactionReference,
            Notes                = "14-day free trial — no charge. Monthly rate: $100 USD after trial.",
            CreatedAt            = DateTime.UtcNow,
        };

        _context.SubscriptionPaymentLogs.Add(paymentLog);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = tenant.Id },
            new
            {
                tenant.Id, tenant.Name, tenant.Slug,
                tenant.SubscriptionPlan,
                tenant.TrialEndsAt,
                tenant.SubscriptionExpiresAt,
                message = "Registration successful. Your 14-day free trial has started. You can now log in.",
            });
    }

    /// <summary>
    /// Public self-service renewal endpoint.
    /// Tenant admin provides their email + QR payment reference.
    /// Subscription is extended 30 days and a pending-verification payment log is created.
    /// </summary>
    [HttpPost("renew")]
    [AllowAnonymous]
    public async Task<IActionResult> Renew([FromBody] TenantRenewalDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Email is required." });

        if (string.IsNullOrWhiteSpace(dto.PaymentReference))
            return BadRequest(new { message = "Payment reference number is required." });

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Role == UserRole.Admin);

        if (user == null)
            return NotFound(new { message = "No admin account found with that email address." });

        var tenant = await _context.Tenants.FindAsync(user.TenantId);
        if (tenant == null)
            return NotFound(new { message = "Clinic not found." });

        // Extend from current expiry (if still future) or from today
        var baseDate = tenant.SubscriptionExpiresAt.HasValue && tenant.SubscriptionExpiresAt > DateTime.UtcNow
            ? tenant.SubscriptionExpiresAt.Value
            : DateTime.UtcNow;

        tenant.SubscriptionExpiresAt  = baseDate.AddDays(30);
        tenant.SubscriptionPlan       = "Monthly";
        tenant.IsActive               = true;
        tenant.ExpiryWarningSent      = false;
        tenant.ExpiryNotificationSent = false;
        tenant.SubscriptionNotes      = $"Self-service QR renewal {DateTime.UtcNow:yyyy-MM-dd}. Ref: {dto.PaymentReference}";

        _context.SubscriptionPaymentLogs.Add(new SubscriptionPaymentLog
        {
            TenantId             = tenant.Id,
            Plan                 = "Monthly",
            Amount               = 100m,
            Currency             = "USD",
            CardBrand            = "QR",
            CardLast4            = string.Empty,
            Status               = "PendingVerification",
            TransactionReference = dto.PaymentReference,
            Notes                = "Self-service QR renewal — pending SuperAdmin verification.",
            CreatedAt            = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message    = "Renewal submitted. Your subscription is active for another 30 days. Our team will verify your payment reference shortly.",
            clinicName = tenant.Name,
            newExpiresAt = tenant.SubscriptionExpiresAt,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TenantDto dto)
    {
        if (await _context.Tenants.AnyAsync(t => t.Slug == dto.Slug))
            return Conflict(new { message = "Slug already in use." });

        var tenant = new Tenant
        {
            Name = dto.Name,
            Slug = dto.Slug.ToLowerInvariant(),
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            Address = dto.Address,
            City = dto.City,
            Country = dto.Country,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, tenant);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TenantDto dto)
    {
        var tenant = await _context.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        if (await _context.Tenants.AnyAsync(t => t.Slug == dto.Slug && t.Id != id))
            return Conflict(new { message = "Slug already in use." });

        tenant.Name = dto.Name;
        tenant.Slug = dto.Slug.ToLowerInvariant();
        tenant.ContactEmail = dto.ContactEmail;
        tenant.ContactPhone = dto.ContactPhone;
        tenant.Address = dto.Address;
        tenant.City = dto.City;
        tenant.Country = dto.Country;
        tenant.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(tenant);
    }

    [HttpPatch("{id:int}/subscription")]
    public async Task<IActionResult> UpdateSubscription(int id, [FromBody] SubscriptionDto dto)
    {
        var tenant = await _context.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        tenant.SubscriptionPlan      = dto.SubscriptionPlan;
        tenant.SubscriptionExpiresAt = dto.SubscriptionExpiresAt;
        tenant.SubscriptionNotes     = dto.SubscriptionNotes;
        tenant.ModifiedDate          = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new
        {
            tenant.Id,
            tenant.SubscriptionPlan,
            tenant.SubscriptionExpiresAt,
            tenant.SubscriptionNotes,
            SubscriptionStatus = tenant.SubscriptionStatus.ToString(),
        });
    }

    [HttpPatch("{id:int}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var tenant = await _context.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        tenant.IsActive = !tenant.IsActive;
        tenant.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { tenant.Id, tenant.IsActive });
    }
}

public record TenantDto(
    string Name,
    string Slug,
    string? ContactEmail,
    string? ContactPhone,
    string? Address,
    string? City,
    string? Country
);

public record SubscriptionDto(
    string SubscriptionPlan,
    DateTime? SubscriptionExpiresAt,
    string? SubscriptionNotes
);

public record TenantRegistrationDto(
    // Clinic info
    string ClinicName,
    string Slug,
    string? Phone,
    string? Address,
    string? City,
    string? Country,
    // First admin account
    string AdminFirstName,
    string AdminLastName,
    string AdminEmail,
    string AdminPassword,
    // Subscription / payment
    string? SelectedPlan,
    string? CardLast4,
    string? CardBrand,
    string? TransactionReference
);

public record TenantRenewalDto(
    string Email,
    string PaymentReference
);
