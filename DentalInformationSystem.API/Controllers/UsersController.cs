using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.API.DTOs;
using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Domain.Enums;
using DentalInformationSystem.Repositories.Extensions;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManageUsers)] // Admin only
public class UsersController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public UsersController(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] UserRole? role = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _unitOfWork.Users.GetAll();

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

    [HttpGet("dentists")]
    [AllowAnonymous]
    [Authorize(Policy = Policies.CanScheduleAppointments)]
    public async Task<IActionResult> GetDentists()
    {
        // ClinicalStaff includes dentists and dental hygienists
        var clinicalStaff = await _unitOfWork.Users
            .Find(u => u.Role == UserRole.ClinicalStaff && u.IsActive)
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
            .Find(u => u.IsActive)
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
            .Find(u => u.Role == role && u.IsActive)
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

        // Soft delete - just deactivate
        user.IsActive = false;
        _unitOfWork.Users.Update(user);
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
