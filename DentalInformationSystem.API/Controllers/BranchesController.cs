using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BranchesController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public BranchesController(IUnitOfWork uow, IAuditService audit)
    {
        _uow = uow;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? activeOnly = true)
    {
        var query = _uow.Branches.GetAll();
        if (activeOnly == true)
            query = query.Where(b => b.IsActive);

        var branches = await query
            .OrderBy(b => b.IsMainBranch ? 0 : 1)
            .ThenBy(b => b.Name)
            .Select(b => new
            {
                b.Id, b.Name, b.Code, b.Address, b.City, b.Phone, b.Email,
                b.ManagerName, b.IsActive, b.IsMainBranch, b.CreatedDate
            })
            .ToListAsync();

        return Ok(branches);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var branch = await _uow.Branches.GetAll()
            .Where(b => b.Id == id)
            .Select(b => new
            {
                b.Id, b.Name, b.Code, b.Address, b.City, b.Phone, b.Email,
                b.ManagerName, b.IsActive, b.IsMainBranch, b.CreatedDate, b.ModifiedDate
            })
            .FirstOrDefaultAsync();

        if (branch == null) return NotFound();
        return Ok(branch);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateBranchRequest req)
    {
        var codeExists = await _uow.Branches.GetAll().AnyAsync(b => b.Code == req.Code);
        if (codeExists) return BadRequest(new { message = $"Branch code '{req.Code}' is already in use." });

        var branch = new Branch
        {
            Name = req.Name,
            Code = req.Code.ToUpper(),
            Address = req.Address,
            City = req.City,
            Phone = req.Phone,
            Email = req.Email,
            ManagerName = req.ManagerName,
            IsMainBranch = req.IsMainBranch
        };

        await _uow.Branches.AddAsync(branch);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Created", "Branch", branch.Id.ToString(), $"Branch '{branch.Name}' ({branch.Code}) created.");

        return CreatedAtAction(nameof(GetById), new { id = branch.Id }, new { branch.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateBranchRequest req)
    {
        var branch = await _uow.Branches.GetByIdAsync(id);
        if (branch == null) return NotFound();

        var codeExists = await _uow.Branches.GetAll()
            .AnyAsync(b => b.Code == req.Code && b.Id != id);
        if (codeExists) return BadRequest(new { message = $"Branch code '{req.Code}' is already in use." });

        branch.Name = req.Name;
        branch.Code = req.Code.ToUpper();
        branch.Address = req.Address;
        branch.City = req.City;
        branch.Phone = req.Phone;
        branch.Email = req.Email;
        branch.ManagerName = req.ManagerName;
        branch.IsMainBranch = req.IsMainBranch;
        branch.ModifiedDate = DateTime.UtcNow;

        _uow.Branches.Update(branch);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Updated", "Branch", id.ToString(), $"Branch '{branch.Name}' updated.");

        return NoContent();
    }

    [HttpPatch("{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Toggle(int id)
    {
        var branch = await _uow.Branches.GetByIdAsync(id);
        if (branch == null) return NotFound();

        branch.IsActive = !branch.IsActive;
        branch.ModifiedDate = DateTime.UtcNow;
        _uow.Branches.Update(branch);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Toggled", "Branch", id.ToString(), $"Branch '{branch.Name}' set to {(branch.IsActive ? "Active" : "Inactive")}.");

        return Ok(new { branch.IsActive });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var branch = await _uow.Branches.GetByIdAsync(id);
        if (branch == null) return NotFound();

        // Soft-delete by deactivating
        branch.IsActive = false;
        branch.ModifiedDate = DateTime.UtcNow;
        _uow.Branches.Update(branch);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Deleted", "Branch", id.ToString(), $"Branch '{branch.Name}' soft-deleted.");

        return NoContent();
    }
}

public record CreateBranchRequest(
    string Name, string Code, string? Address, string? City,
    string? Phone, string? Email, string? ManagerName, bool IsMainBranch);

