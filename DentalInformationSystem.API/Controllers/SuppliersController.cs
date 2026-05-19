using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Extensions;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManageInventory)] // Admin, InventoryManager
public class SuppliersController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public SuppliersController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _unitOfWork.Suppliers.GetAll();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s =>
                s.Name.Contains(search) ||
                s.ContactPerson.Contains(search) ||
                s.Email.Contains(search));
        }

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        query = query.OrderBy(s => s.Name);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(id);
        if (supplier == null)
            return NotFound(new { message = "Supplier not found" });

        return Ok(supplier);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Supplier supplier)
    {
        if (await _unitOfWork.Suppliers.AnyAsync(s => s.Email == supplier.Email))
            return BadRequest(new { message = "Email already exists" });

        supplier.CreatedDate = DateTime.UtcNow;
        await _unitOfWork.Suppliers.AddAsync(supplier);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Supplier supplier)
    {
        var existing = await _unitOfWork.Suppliers.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Supplier not found" });

        if (await _unitOfWork.Suppliers.AnyAsync(s => s.Email == supplier.Email && s.Id != id))
            return BadRequest(new { message = "Email already exists" });

        existing.Name = supplier.Name;
        existing.ContactPerson = supplier.ContactPerson;
        existing.Email = supplier.Email;
        existing.PhoneNumber = supplier.PhoneNumber;
        existing.Address = supplier.Address;
        existing.City = supplier.City;
        existing.State = supplier.State;
        existing.PostalCode = supplier.PostalCode;
        existing.TaxId = supplier.TaxId;
        existing.Notes = supplier.Notes;
        existing.IsActive = supplier.IsActive;

        _unitOfWork.Suppliers.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(id);
        if (supplier == null)
            return NotFound(new { message = "Supplier not found" });

        supplier.IsActive = !supplier.IsActive;
        _unitOfWork.Suppliers.Update(supplier);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = $"Supplier {(supplier.IsActive ? "activated" : "deactivated")} successfully", isActive = supplier.IsActive });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(id);
        if (supplier == null)
            return NotFound(new { message = "Supplier not found" });

        // Soft delete
        supplier.IsActive = false;
        _unitOfWork.Suppliers.Update(supplier);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var suppliers = await _unitOfWork.Suppliers
            .Find(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(suppliers);
    }
}
