using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.API.DTOs;
using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Extensions;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManageUsers)] // Admin only
public class UsersController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;
    private readonly TenantContext _tenantContext;

    public UsersController(IUnitOfWork unitOfWork, IAuthService authService, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] UserRole? role = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _unitOfWork.Users.GetAll();

        // Scope to the current tenant (SuperAdmin sees all when no tenant is selected)
        if (_tenantContext.TenantId.HasValue)
            query = query.Where(u => u.TenantId == _tenantContext.TenantId.Value);

        // Non-SuperAdmins must never see SuperAdmin accounts
        var isSuperAdmin = User.IsInRole("SuperAdmin");
        if (!isSuperAdmin)
            query = query.Where(u => u.Role != UserRole.SuperAdmin);

        // Staff Management never shows Patient accounts — they are managed in the Patients page
        query = query.Where(u => u.Role != UserRole.Patient);

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        query = query.OrderBy(u => u.LastName).ThenBy(u => u.FirstName);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        // Don't return password hashes
        var users = result.Items.Select(u => new
        {
            u.Id,
            u.FirstName,
            u.LastName,
            u.FullName,
            u.Email,
            u.PhoneNumber,
            Role = u.Role.ToString(),
            u.Specialization,
            u.LicenseNumber,
            u.IsActive,
            u.CreatedDate,
            u.LastLoginDate
        });

        return Ok(new
        {
            items = users,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
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
            user.IsActive,
            user.CreatedDate,
            user.LastLoginDate
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto updateDto)
    {
        var existing = await _unitOfWork.Users.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "User not found" });

        // Check if email is being changed and if it's already in use
        if (existing.Email != updateDto.Email)
        {
            if (await _unitOfWork.Users.AnyAsync(u => u.Email == updateDto.Email))
                return BadRequest(new { message = "Email already in use" });
        }

        existing.FirstName = updateDto.FirstName;
        existing.LastName = updateDto.LastName;
        existing.Email = updateDto.Email;
        existing.PhoneNumber = updateDto.PhoneNumber;
        existing.Specialization = updateDto.Specialization;
        existing.LicenseNumber = updateDto.LicenseNumber;

        _unitOfWork.Users.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "User updated successfully" });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        user.IsActive = !user.IsActive;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully", isActive = user.IsActive });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto resetDto)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        user.PasswordHash = _authService.HashPassword(resetDto.NewPassword);
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Password reset successfully" });
    }

    [HttpGet("doctors")]
    [HttpGet("dentists")] // kept for backward compatibility
    [AllowAnonymous]
    [Authorize(Policy = Policies.CanScheduleAppointments)]
    public async Task<IActionResult> GetDoctors()
    {
        // ClinicalStaff includes doctors and clinical staff
        var clinicalStaff = await _unitOfWork.Users
            .Find(u => u.Role == UserRole.ClinicalStaff && u.IsActive
                       && (!_tenantContext.TenantId.HasValue || u.TenantId == _tenantContext.TenantId.Value))
            .OrderBy(u => u.LastName)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Specialization,
                u.LicenseNumber,
                u.Email,
                u.PhoneNumber
            })
            .ToListAsync();

        return Ok(clinicalStaff);
    }

    [HttpGet("staff")]
    [Authorize(Policy = Policies.CanViewReports)]
    public async Task<IActionResult> GetStaff()
    {
        var staff = await _unitOfWork.Users
            .Find(u => u.IsActive
                       && (!_tenantContext.TenantId.HasValue || u.TenantId == _tenantContext.TenantId.Value))
            .OrderBy(u => u.Role)
            .ThenBy(u => u.LastName)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                Role = u.Role.ToString(),
                u.Email,
                u.PhoneNumber
            })
            .ToListAsync();

        return Ok(staff);
    }

    [HttpGet("by-role/{role}")]
    public async Task<IActionResult> GetByRole(UserRole role)
    {
        var users = await _unitOfWork.Users
            .Find(u => u.Role == role && u.IsActive
                       && (!_tenantContext.TenantId.HasValue || u.TenantId == _tenantContext.TenantId.Value))
            .OrderBy(u => u.LastName)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.Specialization,
                u.LicenseNumber
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        // Hard delete — deactivate/activate is handled by the toggle-active endpoint
        _unitOfWork.Users.Remove(user);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }
}

public class UpdateUserDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }
}

public class ResetPasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
}
