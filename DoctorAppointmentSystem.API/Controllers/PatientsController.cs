using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Extensions;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

// ── DTO used for create / update — keeps navigation props out of the model binder ──
public record PatientDto(
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    Gender Gender,
    string Email,
    string PhoneNumber,
    string? AlternatePhoneNumber,
    string Address,
    string City,
    string? State,
    string PostalCode,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? InsuranceProvider,
    string? InsurancePolicyNumber,
    string? BloodType,
    string? Allergies,
    string? MedicalHistory,
    string? Notes,
    bool IsActive = true
);

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManagePatients)] // Admin, Receptionist, Dentist
public class PatientsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public PatientsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
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
    public async Task<IActionResult> Create([FromBody] PatientDto dto)
    {
        if (await _unitOfWork.Patients.AnyAsync(p => p.Email == dto.Email))
            return BadRequest(new { message = "Email already exists" });

        var patient = new Patient
        {
            FirstName            = dto.FirstName,
            LastName             = dto.LastName,
            DateOfBirth          = dto.DateOfBirth,
            Gender               = dto.Gender,
            Email                = dto.Email,
            PhoneNumber          = dto.PhoneNumber,
            AlternatePhoneNumber = dto.AlternatePhoneNumber,
            Address              = dto.Address,
            City                 = dto.City,
            State                = dto.State,
            PostalCode           = dto.PostalCode,
            EmergencyContactName  = dto.EmergencyContactName,
            EmergencyContactPhone = dto.EmergencyContactPhone,
            InsuranceProvider    = dto.InsuranceProvider,
            InsurancePolicyNumber = dto.InsurancePolicyNumber,
            BloodType            = dto.BloodType,
            Allergies            = dto.Allergies,
            MedicalHistory       = dto.MedicalHistory,
            Notes                = dto.Notes,
            IsActive             = dto.IsActive,
            TenantId             = _tenantContext.TenantId ?? 0,
            CreatedDate          = DateTime.UtcNow,
        };

        await _unitOfWork.Patients.AddAsync(patient);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PatientDto dto)
    {
        var existing = await _unitOfWork.Patients.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Patient not found" });

        if (await _unitOfWork.Patients.AnyAsync(p => p.Email == dto.Email && p.Id != id))
            return BadRequest(new { message = "Email already exists" });

        existing.FirstName            = dto.FirstName;
        existing.LastName             = dto.LastName;
        existing.DateOfBirth          = dto.DateOfBirth;
        existing.Gender               = dto.Gender;
        existing.Email                = dto.Email;
        existing.PhoneNumber          = dto.PhoneNumber;
        existing.AlternatePhoneNumber = dto.AlternatePhoneNumber;
        existing.Address              = dto.Address;
        existing.City                 = dto.City;
        existing.State                = dto.State;
        existing.PostalCode           = dto.PostalCode;
        existing.EmergencyContactName  = dto.EmergencyContactName;
        existing.EmergencyContactPhone = dto.EmergencyContactPhone;
        existing.InsuranceProvider    = dto.InsuranceProvider;
        existing.InsurancePolicyNumber = dto.InsurancePolicyNumber;
        existing.BloodType            = dto.BloodType;
        existing.Allergies            = dto.Allergies;
        existing.MedicalHistory       = dto.MedicalHistory;
        existing.Notes                = dto.Notes;
        existing.IsActive             = dto.IsActive;

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
