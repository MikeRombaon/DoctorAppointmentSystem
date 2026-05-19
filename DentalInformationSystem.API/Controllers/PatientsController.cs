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
[Authorize(Policy = Policies.CanManagePatients)] // Admin, Receptionist, Dentist
public class PatientsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public PatientsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _unitOfWork.Patients.GetAll();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                p.FirstName.Contains(search) ||
                p.LastName.Contains(search) ||
                p.Email.Contains(search) ||
                p.PhoneNumber.Contains(search));
        }

        if (isActive.HasValue)
        {
            query = query.Where(p => p.IsActive == isActive.Value);
        }

        query = query.OrderBy(p => p.LastName).ThenBy(p => p.FirstName);

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
        var patient = await _unitOfWork.Patients
            .Find(p => p.Id == id)
            .Include(p => p.Appointments)
            .Include(p => p.TreatmentPlans)
            .FirstOrDefaultAsync();

        if (patient == null)
            return NotFound(new { message = "Patient not found" });

        return Ok(patient);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Patient patient)
    {
        if (await _unitOfWork.Patients.AnyAsync(p => p.Email == patient.Email))
            return BadRequest(new { message = "Email already exists" });

        patient.CreatedDate = DateTime.UtcNow;
        await _unitOfWork.Patients.AddAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Patient patient)
    {
        var existing = await _unitOfWork.Patients.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Patient not found" });

        // Check email uniqueness
        if (await _unitOfWork.Patients.AnyAsync(p => p.Email == patient.Email && p.Id != id))
            return BadRequest(new { message = "Email already exists" });

        // Update properties
        existing.FirstName = patient.FirstName;
        existing.LastName = patient.LastName;
        existing.DateOfBirth = patient.DateOfBirth;
        existing.Gender = patient.Gender;
        existing.Email = patient.Email;
        existing.PhoneNumber = patient.PhoneNumber;
        existing.AlternatePhoneNumber = patient.AlternatePhoneNumber;
        existing.Address = patient.Address;
        existing.City = patient.City;
        existing.State = patient.State;
        existing.PostalCode = patient.PostalCode;
        existing.EmergencyContactName = patient.EmergencyContactName;
        existing.EmergencyContactPhone = patient.EmergencyContactPhone;
        existing.InsuranceProvider = patient.InsuranceProvider;
        existing.InsurancePolicyNumber = patient.InsurancePolicyNumber;
        existing.BloodType = patient.BloodType;
        existing.Allergies = patient.Allergies;
        existing.MedicalHistory = patient.MedicalHistory;
        existing.Notes = patient.Notes;
        existing.IsActive = patient.IsActive;

        _unitOfWork.Patients.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var patient = await _unitOfWork.Patients.GetByIdAsync(id);
        if (patient == null)
            return NotFound(new { message = "Patient not found" });

        // Soft delete
        patient.IsActive = false;
        _unitOfWork.Patients.Update(patient);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string term)
    {
        if (string.IsNullOrWhiteSpace(term))
            return BadRequest(new { message = "Search term is required" });

        var patients = await _unitOfWork.Patients
            .Find(p =>
                p.FirstName.Contains(term) ||
                p.LastName.Contains(term) ||
                p.Email.Contains(term) ||
                p.PhoneNumber.Contains(term))
            .Take(10)
            .ToListAsync();

        return Ok(patients);
    }
}
