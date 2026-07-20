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

// ── DTOs ────────────────────────────────────────────────────────────────────
public record AppointmentDto(
    int PatientId,
    int DoctorId,
    DateTime AppointmentDate,
    TimeSpan StartTime,
    TimeSpan EndTime,
    string Purpose,
    string? Notes = null,
    int? BranchId = null,
    string? ChairNumber = null
);

public record AppointmentUpdateDto(
    DateTime AppointmentDate,
    TimeSpan StartTime,
    TimeSpan EndTime,
    string Purpose,
    AppointmentStatus Status,
    string? Notes = null
);

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanScheduleAppointments)]
public class AppointmentsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public AppointmentsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? doctorId = null,
        [FromQuery] int? patientId = null,
        [FromQuery] AppointmentStatus? status = null,
        [FromQuery] bool activeOnly = false)
    {
        // IgnoreQueryFilters so that Patient/Dentist navigations are not blocked by the
        // Patient.TenantId or User.TenantId global filter when patients are cross-tenant
        // (e.g. a patient from tenant 3 books with a doctor in tenant 1).
        // The Appointment tenant scope is re-applied explicitly below.
        IQueryable<Appointment> query = _unitOfWork.Appointments.GetAll()
            .IgnoreQueryFilters()
            .Where(a => !a.IsWalkIn)
            .Where(a => !_tenantContext.TenantId.HasValue || a.TenantId == _tenantContext.TenantId.Value)
            .Include(a => a.Patient)
            .Include(a => a.Dentist);

        if (activeOnly)
        {
            var terminalStatuses = new[]
            {
                AppointmentStatus.Cancelled,
                AppointmentStatus.Completed,
                AppointmentStatus.NoShow,
            };
            query = query.Where(a => !terminalStatuses.Contains(a.Status));
        }

        if (date.HasValue)
        {
            query = query.Where(a => a.AppointmentDate.Date == date.Value.Date);
        }

        if (doctorId.HasValue)
        {
            query = query.Where(a => a.DentistId == doctorId.Value);
        }

        if (patientId.HasValue)
        {
            query = query.Where(a => a.PatientId == patientId.Value);
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
            .IgnoreQueryFilters()
            .Where(a => !_tenantContext.TenantId.HasValue || a.TenantId == _tenantContext.TenantId.Value)
            .Include(a => a.Patient)
            .Include(a => a.Dentist)
            .Include(a => a.Treatments)
            .FirstOrDefaultAsync();

        if (appointment == null)
            return NotFound(new { message = "Appointment not found" });

        return Ok(appointment);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AppointmentDto dto)
    {
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == dto.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        if (!await _unitOfWork.Users.AnyAsync(u => u.Id == dto.DoctorId))
            return BadRequest(new { message = "Invalid doctor ID" });

        // Reject booking on days where the doctor has an all-day emergency block.
        var allDayBlock = await _unitOfWork.ScheduleBlocks
            .Find(b => b.DentistId == dto.DoctorId
                    && b.BlockDate.Date == dto.AppointmentDate.Date
                    && b.IsAllDay)
            .FirstOrDefaultAsync();

        if (allDayBlock != null)
            return BadRequest(new
            {
                message = $"Doctor is not available due to {allDayBlock.Reason}"
            });

        var appointment = new Appointment
        {
            PatientId       = dto.PatientId,
            DentistId       = dto.DoctorId,
            AppointmentDate = dto.AppointmentDate,
            StartTime       = dto.StartTime,
            EndTime         = dto.EndTime,
            Purpose         = dto.Purpose,
            Notes           = dto.Notes,
            BranchId        = dto.BranchId,
            ChairNumber     = dto.ChairNumber,
            TenantId        = _tenantContext.TenantId ?? 0,
            Status          = AppointmentStatus.Scheduled,
            CreatedDate     = DateTime.UtcNow,
        };

        await _unitOfWork.Appointments.AddAsync(appointment);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, appointment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AppointmentUpdateDto dto)
    {
        var existing = await _unitOfWork.Appointments.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Appointment not found" });

        existing.AppointmentDate = dto.AppointmentDate;
        existing.StartTime       = dto.StartTime;
        existing.EndTime         = dto.EndTime;
        existing.Purpose         = dto.Purpose;
        existing.Status          = dto.Status;
        existing.Notes           = dto.Notes;
        existing.ModifiedDate    = DateTime.UtcNow;

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

        var currentTime = DateTime.UtcNow;
        var appointment = new Appointment
        {
            PatientId       = dto.PatientId,
            DentistId       = dto.DentistId,
            AppointmentDate = currentTime.Date,
            StartTime       = currentTime.TimeOfDay,
            EndTime         = currentTime.AddHours(1).TimeOfDay,
            Purpose         = dto.Purpose ?? "Walk-in consultation",
            Status          = AppointmentStatus.WalkIn,
            IsWalkIn        = true,
            Notes           = dto.Notes,
            TenantId        = _tenantContext.TenantId ?? 0,
            CreatedDate     = DateTime.UtcNow
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
        var targetDate = date?.Date ?? DateTime.UtcNow.Date;

        var query = _unitOfWork.Appointments.GetAll()
            .IgnoreQueryFilters()
            .Where(a => !_tenantContext.TenantId.HasValue || a.TenantId == _tenantContext.TenantId.Value)
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
    public async Task<IActionResult> GetUpcoming([FromQuery] int? patientId = null, [FromQuery] int? doctorId = null)
    {
        IQueryable<Appointment> query = _unitOfWork.Appointments.GetAll()
            .IgnoreQueryFilters()
            .Where(a => !_tenantContext.TenantId.HasValue || a.TenantId == _tenantContext.TenantId.Value)
            .Where(a => a.AppointmentDate >= DateTime.Today && a.Status == AppointmentStatus.Scheduled)
            .Include(a => a.Patient)
            .Include(a => a.Dentist);

        if (patientId.HasValue)
        {
            query = query.Where(a => a.PatientId == patientId.Value);
        }

        if (doctorId.HasValue)
        {
            query = query.Where(a => a.DentistId == doctorId.Value);
        }

        var appointments = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .Take(20)
            .ToListAsync();

        return Ok(appointments);
    }
    [HttpPost("bulk-cancel")]
    public async Task<IActionResult> BulkCancel([FromBody] BulkCancelDto dto)
    {
        var cancellableStatuses = new[]
        {
            AppointmentStatus.Scheduled,
            AppointmentStatus.Confirmed,
            AppointmentStatus.CheckedIn,
        };

        var appointments = await _unitOfWork.Appointments
            .Find(a =>
                a.DentistId == dto.DoctorId &&
                a.AppointmentDate.Date == dto.Date.Date &&
                cancellableStatuses.Contains(a.Status))
            .ToListAsync();

        if (appointments.Count == 0)
            return Ok(new { cancelledCount = 0, message = "No active appointments found for that doctor on the selected date." });

        foreach (var appt in appointments)
        {
            appt.Status       = AppointmentStatus.Cancelled;
            appt.Notes        = string.IsNullOrWhiteSpace(appt.Notes)
                                    ? $"Emergency cancellation: {dto.Reason}"
                                    : $"{appt.Notes} | Emergency cancellation: {dto.Reason}";
            appt.ModifiedDate = DateTime.UtcNow;
            _unitOfWork.Appointments.Update(appt);
        }

        await _unitOfWork.SaveChangesAsync();

        // Block the day so no new appointments can be booked for this doctor.
        var existingBlock = await _unitOfWork.ScheduleBlocks
            .Find(b => b.DentistId == dto.DoctorId
                    && b.BlockDate.Date == dto.Date.Date
                    && b.IsAllDay)
            .FirstOrDefaultAsync();

        if (existingBlock == null)
        {
            await _unitOfWork.ScheduleBlocks.AddAsync(new ScheduleBlock
            {
                DentistId   = dto.DoctorId,
                BlockDate   = dto.Date.Date,
                IsAllDay    = true,
                Reason      = $"Emergency cancellation: {dto.Reason}",
                TenantId    = _tenantContext.TenantId ?? 0,
                CreatedDate = DateTime.UtcNow,
            });
            await _unitOfWork.SaveChangesAsync();
        }

        return Ok(new { cancelledCount = appointments.Count, message = $"{appointments.Count} appointment(s) cancelled successfully." });
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

public class BulkCancelDto
{
    public int DoctorId { get; set; }
    public DateTime Date { get; set; }
    public string Reason { get; set; } = string.Empty;
}
