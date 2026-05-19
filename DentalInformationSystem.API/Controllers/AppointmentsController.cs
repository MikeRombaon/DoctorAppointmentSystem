using DentalInformationSystem.API.Authorization;
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
[Authorize(Policy = Policies.CanScheduleAppointments)] // Admin, Receptionist
public class AppointmentsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public AppointmentsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? dentistId = null,
        [FromQuery] AppointmentStatus? status = null)
    {
        IQueryable<Appointment> query = _unitOfWork.Appointments.GetAll()
            .Include(a => a.Patient)
            .Include(a => a.Dentist);

        if (date.HasValue)
        {
            query = query.Where(a => a.AppointmentDate.Date == date.Value.Date);
        }

        if (dentistId.HasValue)
        {
            query = query.Where(a => a.DentistId == dentistId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        query = query.OrderBy(a => a.AppointmentDate).ThenBy(a => a.StartTime);

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
        var appointment = await _unitOfWork.Appointments
            .Find(a => a.Id == id)
            .Include(a => a.Patient)
            .Include(a => a.Dentist)
            .Include(a => a.Treatments)
            .FirstOrDefaultAsync();

        if (appointment == null)
            return NotFound(new { message = "Appointment not found" });

        return Ok(appointment);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Appointment appointment)
    {
        // Validate patient exists
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == appointment.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        // Validate dentist exists
        if (!await _unitOfWork.Users.AnyAsync(u => u.Id == appointment.DentistId))
            return BadRequest(new { message = "Invalid dentist ID" });

        appointment.CreatedDate = DateTime.UtcNow;
        appointment.Status = AppointmentStatus.Scheduled;

        await _unitOfWork.Appointments.AddAsync(appointment);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, appointment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Appointment appointment)
    {
        var existing = await _unitOfWork.Appointments.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Appointment not found" });

        existing.AppointmentDate = appointment.AppointmentDate;
        existing.StartTime = appointment.StartTime;
        existing.EndTime = appointment.EndTime;
        existing.Purpose = appointment.Purpose;
        existing.Status = appointment.Status;
        existing.Notes = appointment.Notes;
        existing.ModifiedDate = DateTime.UtcNow;

        _unitOfWork.Appointments.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] AppointmentStatus status)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdAsync(id);
        if (appointment == null)
            return NotFound(new { message = "Appointment not found" });

        appointment.Status = status;
        appointment.ModifiedDate = DateTime.UtcNow;

        _unitOfWork.Appointments.Update(appointment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(appointment);
    }

    [HttpPost("walk-in")]
    public async Task<IActionResult> CreateWalkIn([FromBody] WalkInAppointmentDto dto)
    {
        // Validate patient exists
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == dto.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        // Validate dentist exists
        if (!await _unitOfWork.Users.AnyAsync(u => u.Id == dto.DentistId))
            return BadRequest(new { message = "Invalid dentist ID" });

        var currentTime = DateTime.Now;
        var appointment = new Appointment
        {
            PatientId = dto.PatientId,
            DentistId = dto.DentistId,
            AppointmentDate = currentTime.Date,
            StartTime = currentTime.TimeOfDay,
            EndTime = currentTime.AddHours(1).TimeOfDay, // Default 1 hour duration
            Purpose = dto.Purpose ?? "Walk-in consultation",
            Status = AppointmentStatus.WalkIn,
            IsWalkIn = true,
            Notes = dto.Notes,
            CreatedDate = DateTime.UtcNow
        };

        await _unitOfWork.Appointments.AddAsync(appointment);
        await _unitOfWork.SaveChangesAsync();

        // Load navigation properties for response
        var createdAppointment = await _unitOfWork.Appointments
            .Find(a => a.Id == appointment.Id)
            .Include(a => a.Patient)
            .Include(a => a.Dentist)
            .FirstOrDefaultAsync();

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, createdAppointment);
    }

    [HttpGet("walk-ins")]
    public async Task<IActionResult> GetWalkIns(
        [FromQuery] DateTime? date = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var targetDate = date ?? DateTime.Today;

        var query = _unitOfWork.Appointments.GetAll()
            .Where(a => a.IsWalkIn && a.AppointmentDate.Date == targetDate.Date)
            .Include(a => a.Patient)
            .Include(a => a.Dentist)
            .OrderByDescending(a => a.CreatedDate);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize,
            date = targetDate
        });
    }

    [HttpGet("upcoming")]
    public async Task<IActionResult> GetUpcoming([FromQuery] int? patientId = null, [FromQuery] int? dentistId = null)
    {
        IQueryable<Appointment> query = _unitOfWork.Appointments.GetAll()
            .Where(a => a.AppointmentDate >= DateTime.Today && a.Status == AppointmentStatus.Scheduled)
            .Include(a => a.Patient)
            .Include(a => a.Dentist);

        if (patientId.HasValue)
        {
            query = query.Where(a => a.PatientId == patientId.Value);
        }

        if (dentistId.HasValue)
        {
            query = query.Where(a => a.DentistId == dentistId.Value);
        }

        var appointments = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .Take(20)
            .ToListAsync();

        return Ok(appointments);
    }
}

// Walk-In DTO
public class WalkInAppointmentDto
{
    public int PatientId { get; set; }
    public int DentistId { get; set; }
    public string? Purpose { get; set; }
    public string? Notes { get; set; }
}
