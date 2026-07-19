using DoctorAppointmentSystem.API.DTOs;
using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Data;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _db;
    private readonly TenantContext _tenantContext;

    public AuthController(
        IUnitOfWork unitOfWork,
        IAuthService authService,
        IConfiguration configuration,
        ApplicationDbContext db,
        TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
        _configuration = configuration;
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        // Find user by email
        var user = await _unitOfWork.Users
            .Find(u => u.Email == loginDto.Email)
            .FirstOrDefaultAsync();

        if (user == null)
            return Unauthorized(new { message = "Invalid email or password" });

        // Verify password
        if (!_authService.VerifyPassword(loginDto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password" });

        // Check if user is active
        if (!user.IsActive)
            return Unauthorized(new { message = "Account is inactive" });

        // Check tenant subscription expiry (skip for SuperAdmin)
        if (user.Role != UserRole.SuperAdmin && user.TenantId.HasValue)
        {
            var tenant = await _db.Tenants
                .AsNoTracking()
                .Where(t => t.Id == user.TenantId.Value)
                .Select(t => new { t.IsActive, t.SubscriptionExpiresAt, t.Name })
                .FirstOrDefaultAsync();

            if (tenant != null && !tenant.IsActive)
                return Unauthorized(new { message = "Your clinic account has been deactivated. Please contact your system administrator or support to reactivate it.", code = "CLINIC_DEACTIVATED" });

            if (tenant?.SubscriptionExpiresAt != null && tenant.SubscriptionExpiresAt < DateTime.UtcNow)
                return StatusCode(403, new
                {
                    message = $"Your clinic's subscription expired on {tenant.SubscriptionExpiresAt.Value:MMMM dd, yyyy}. Please contact your administrator to renew.",
                    code    = "SUBSCRIPTION_EXPIRED",
                    expiredAt = tenant.SubscriptionExpiresAt,
                });
        }

        // Generate JWT token
        var token = _authService.GenerateJwtToken(
            user,
            _configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured"),
            _configuration["Jwt:Issuer"] ?? "DentalClinicAPI",
            _configuration["Jwt:Audience"] ?? "DentalClinicApp"
        );

        // Update last login
        user.LastLoginDate = DateTime.UtcNow;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        var response = new LoginResponseDto
        {
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(8)
        };

        return Ok(response);
    }

    [HttpPost("register")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        // Check if email already exists
        if (await _unitOfWork.Users.AnyAsync(u => u.Email == registerDto.Email))
            return BadRequest(new { message = "Email already registered" });

        // Parse role
        if (!Enum.TryParse<UserRole>(registerDto.Role, out var userRole))
            return BadRequest(new { message = "Invalid role" });

        // Create new user
        var user = new User
        {
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Email = registerDto.Email,
            PasswordHash = _authService.HashPassword(registerDto.Password),
            PhoneNumber = registerDto.PhoneNumber,
            Role = userRole,
            Specialization = registerDto.Specialization,
            LicenseNumber = registerDto.LicenseNumber,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        // Auto-create a linked Patient profile for Patient-role accounts
        if (userRole == UserRole.Patient)
        {
            var patient = new Patient
            {
                FirstName   = user.FirstName,
                LastName    = user.LastName,
                Email       = user.Email,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                Address     = string.Empty,
                City        = string.Empty,
                PostalCode  = string.Empty,
                IsActive    = true,
                TenantId    = _tenantContext.TenantId ?? 0,
                CreatedDate = DateTime.UtcNow,
                UserId      = user.Id,
            };
            await _unitOfWork.Patients.AddAsync(patient);
            await _unitOfWork.SaveChangesAsync();
        }

        return Ok(new { message = "User registered successfully", userId = user.Id });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
    {
        // Get current user ID from claims
        var userIdClaim = User.FindFirst("UserId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        // Verify current password
        if (!_authService.VerifyPassword(changePasswordDto.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect" });

        // Update password
        user.PasswordHash = _authService.HashPassword(changePasswordDto.NewPassword);
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully" });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(new
        {
            user.Id,
            user.FirstName,
            user.LastName,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            Role = user.Role.ToString(),
            user.Specialization,
            user.LicenseNumber,
            user.IsActive
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // In a stateless JWT implementation, logout is handled client-side
        // by removing the token. You can implement token blacklisting if needed.
        return Ok(new { message = "Logged out successfully" });
    }
}
