using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DoctorAppointmentSystem.API.Controllers;

/// <summary>
/// Patient self-service portal — patients see only their own data.
/// </summary>
[ApiController]
[Route("api/portal")]
[Authorize(Policy = "CanViewOwnRecords")]
public class PatientPortalController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly TenantContext _tenantContext;

    public PatientPortalController(IUnitOfWork uow, TenantContext tenantContext)
    {
        _uow = uow;
        _tenantContext = tenantContext;
    }

    // ── helpers ──────────────────────────────────────────
    private async Task<int?> ResolvePatientIdAsync()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
            return null;

        // Fast path: already linked
        var patient = (await _uow.Patients.FindAsync(p => p.UserId == uid)).FirstOrDefault();
        if (patient != null)
            return patient.Id;

        // Fallback: match by email and link
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(email))
        {
            var byEmail = (await _uow.Patients.FindAsync(p => p.Email == email && p.UserId == null)).FirstOrDefault();
            if (byEmail != null) { byEmail.UserId = uid; _uow.Patients.Update(byEmail); await _uow.SaveChangesAsync(); return byEmail.Id; }
        }

        // Last resort: create a stub profile
        var user = await _uow.Users.Find(u => u.Id == uid).FirstOrDefaultAsync();
        if (user == null) return null;
        var stub = new Patient { FirstName = user.FirstName, LastName = user.LastName, Email = user.Email, PhoneNumber = user.PhoneNumber ?? string.Empty, Address = string.Empty, City = string.Empty, PostalCode = string.Empty, IsActive = true, TenantId = _tenantContext.TenantId ?? user.TenantId ?? 0, CreatedDate = DateTime.UtcNow, UserId = uid };
        await _uow.Patients.AddAsync(stub); await _uow.SaveChangesAsync();
        return stub.Id;
    }
    // GET api/portal/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound("No patient profile linked to this account.");

        var patient = await _uow.Patients.GetByIdAsync(patientId.Value);

        var appointments = (await _uow.Appointments.FindAsync(
            a => a.PatientId == patientId.Value))
            .OrderByDescending(a => a.AppointmentDate).ToList();

        var invoices = (await _uow.Invoices.FindAsync(
            i => i.PatientId == patientId.Value))
            .OrderByDescending(i => i.InvoiceDate).ToList();

        // Treatments are linked through appointments
        var appointmentIds = appointments.Select(a => a.Id).ToHashSet();
        var treatments = (await _uow.Treatments.FindAsync(
            t => appointmentIds.Contains(t.AppointmentId)))
            .OrderByDescending(t => t.TreatmentDate).ToList();

        var now = DateTime.Today;
        return Ok(new
        {
            Patient = new
            {
                patient!.Id, patient.FullName, patient.Email, patient.PhoneNumber,
                patient.DateOfBirth, patient.LastVisitDate,
                Age = now.Year - patient.DateOfBirth.Year -
                      (now < patient.DateOfBirth.AddYears(now.Year - patient.DateOfBirth.Year) ? 1 : 0)
            },
            UpcomingAppointments = appointments
                .Where(a => a.AppointmentDate >= DateTime.Today && a.Status != AppointmentStatus.Cancelled)
                .Take(5)
                .Select(a => new { a.Id, a.AppointmentDate, a.StartTime, a.Purpose, a.Status }),
            RecentTreatments = treatments.Take(5)
                .Select(t => new { t.Id, t.TreatmentDate, t.Status, t.Cost }),
            OutstandingBalance = invoices
                .Where(i => i.Status != PaymentStatus.Paid && i.Status != PaymentStatus.Cancelled)
                .Sum(i => i.BalanceAmount),
            TotalAppointments = appointments.Count,
            TotalTreatments = treatments.Count,
            TotalInvoices = invoices.Count
        });
    }

    // GET api/portal/appointments
    [HttpGet("appointments")]
    [Authorize(Policy = "CanScheduleOwnAppointments")]
    public async Task<IActionResult> GetAppointments([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        var query = (await _uow.Appointments.FindAsync(a => a.PatientId == patientId.Value))
            .OrderByDescending(a => a.AppointmentDate).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status, true, out var statusEnum))
            query = query.Where(a => a.Status == statusEnum);

        var total = query.Count();
        var items = query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new
            {
                a.Id, a.AppointmentDate, a.StartTime, a.EndTime,
                a.Purpose, a.Status, a.Notes, a.IsWalkIn
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/portal/invoices
    [HttpGet("invoices")]
    [Authorize(Policy = "CanViewOwnInvoices")]
    public async Task<IActionResult> GetInvoices([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        var all = (await _uow.Invoices.FindAsync(i => i.PatientId == patientId.Value))
            .OrderByDescending(i => i.InvoiceDate).ToList();

        var total = all.Count;
        var items = all.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(i => new
            {
                i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate,
                i.TotalAmount, i.PaidAmount, i.BalanceAmount, i.Status
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/portal/treatments
    [HttpGet("treatments")]
    public async Task<IActionResult> GetTreatments([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        // Treatments are linked through appointments
        var appointmentIds = (await _uow.Appointments.FindAsync(a => a.PatientId == patientId.Value))
            .Select(a => a.Id).ToHashSet();

        var all = (await _uow.Treatments.FindAsync(t => appointmentIds.Contains(t.AppointmentId)))
            .OrderByDescending(t => t.TreatmentDate).ToList();

        var total = all.Count;
        var items = all.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new
            {
                t.Id, t.TreatmentDate, t.Status, t.Cost,
                t.Diagnosis, t.Notes
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/portal/documents
    [HttpGet("documents")]
    public async Task<IActionResult> GetDocuments()
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        var docs = (await _uow.PatientDocuments.FindAsync(
            d => d.PatientId == patientId.Value && d.IsActive))
            .OrderByDescending(d => d.UploadedDate)
            .Select(d => new
            {
                d.Id, d.FileName, d.ContentType, d.FileSizeBytes,
                d.Category, d.Description, d.UploadedDate
            }).ToList();

        return Ok(docs);
    }

    // GET api/portal/availability?doctorId=&date=
    [HttpGet("availability")]
    [Authorize(Policy = "CanScheduleOwnAppointments")]
    public async Task<IActionResult> CheckAvailability([FromQuery] int doctorId, [FromQuery] DateTime date)
    {
        if (!await _uow.Users.AnyAsync(u => u.Id == doctorId))
            return BadRequest(new { message = "Invalid doctor." });

        var dayOfWeek = date.DayOfWeek;

        // 1. Look for a configured weekly schedule; fall back to 09:00-17:00 / 30-min if none
        var schedule = (await _uow.DentistSchedules.FindAsync(
                s => s.DentistId == doctorId && s.DayOfWeek == dayOfWeek && s.IsAvailable))
            .FirstOrDefault();

        var scheduleStart = schedule?.StartTime    ?? new TimeSpan(9, 0, 0);
        var scheduleEnd   = schedule?.EndTime      ?? new TimeSpan(17, 0, 0);
        int slotDuration  = schedule?.SlotDurationMinutes ?? 30;

        // 2. All-day blocks (emergency leave, day off, surgery)
        var blocks = (await _uow.ScheduleBlocks.FindAsync(
                b => b.DentistId == doctorId && b.BlockDate.Date == date.Date))
            .ToList();

        var allDayBlock = blocks.FirstOrDefault(b => b.IsAllDay);
        if (allDayBlock != null)
            return Ok(new { available = false, slotDurationMinutes = slotDuration, slots = Array.Empty<object>(),
                reason = $"The doctor is unavailable: {allDayBlock.Reason}" });

        // 3. Active appointments on this day
        var activeStatuses = new[]
        {
            AppointmentStatus.Scheduled, AppointmentStatus.Confirmed,
            AppointmentStatus.CheckedIn, AppointmentStatus.InProgress, AppointmentStatus.WalkIn
        };
        var existingAppts = (await _uow.Appointments.FindAsync(
                a => a.DentistId == doctorId && a.AppointmentDate.Date == date.Date
                     && activeStatuses.Contains(a.Status)))
            .ToList();

        // 4. Generate slots and filter out blocked/booked ones
        var slots = new List<object>();
        var current = scheduleStart;

        while (current + TimeSpan.FromMinutes(slotDuration) <= scheduleEnd)
        {
            var slotEnd = current + TimeSpan.FromMinutes(slotDuration);

            bool partialBlocked = blocks.Any(b =>
                !b.IsAllDay && b.StartTime.HasValue && b.EndTime.HasValue &&
                b.StartTime.Value < slotEnd && b.EndTime.Value > current);

            bool appointmentConflict = existingAppts.Any(a =>
                a.StartTime < slotEnd && a.EndTime > current);

            if (!partialBlocked && !appointmentConflict)
                slots.Add(new { startTime = current.ToString(@"hh\:mm"), endTime = slotEnd.ToString(@"hh\:mm") });

            current += TimeSpan.FromMinutes(slotDuration);
        }

        return Ok(new
        {
            available = slots.Count > 0,
            slotDurationMinutes = slotDuration,
            slots,
            reason = slots.Count == 0 ? "No available slots for this doctor on the selected date." : (string?)null
        });
    }

    // POST api/portal/appointments
    [HttpPost("appointments")]
    [Authorize(Policy = "CanScheduleOwnAppointments")]
    public async Task<IActionResult> BookAppointment([FromBody] BookAppointmentDto dto)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound(new { message = "No patient profile linked to this account." });

        if (!await _uow.Users.AnyAsync(u => u.Id == dto.DoctorId))
            return BadRequest(new { message = "Invalid doctor selected." });

        if (dto.AppointmentDate.Date < DateTime.Today)
            return BadRequest(new { message = "Appointment date cannot be in the past." });

        if (dto.EndTime <= dto.StartTime)
            return BadRequest(new { message = "End time must be after start time." });

        // Resolve tenant from the doctor (the appointment belongs to the clinic/tenant where the doctor works)
        var doctor = await _uow.Users.Find(u => u.Id == dto.DoctorId).FirstOrDefaultAsync();
        var tenantId = doctor?.TenantId ?? _tenantContext.TenantId ?? 0;

        // Guard 1: check working-hours window (use default 09:00-17:00 if no schedule configured)
        var schedule = (await _uow.DentistSchedules.FindAsync(
                s => s.DentistId == dto.DoctorId && s.DayOfWeek == dto.AppointmentDate.DayOfWeek && s.IsAvailable))
            .FirstOrDefault();

        var scheduleStart = schedule?.StartTime ?? new TimeSpan(9, 0, 0);
        var scheduleEnd   = schedule?.EndTime   ?? new TimeSpan(17, 0, 0);

        if (dto.StartTime < scheduleStart || dto.EndTime > scheduleEnd)
            return BadRequest(new { message = "The selected time is outside the doctor's working hours." });

        // Guard 2: check for day/time blocks (leave, emergency)
        var blocks = (await _uow.ScheduleBlocks.FindAsync(
                b => b.DentistId == dto.DoctorId && b.BlockDate.Date == dto.AppointmentDate.Date))
            .ToList();

        var allDayBlock = blocks.FirstOrDefault(b => b.IsAllDay);
        if (allDayBlock != null)
            return BadRequest(new { message = $"The doctor is unavailable on this day: {allDayBlock.Reason}" });

        var partialBlock = blocks.FirstOrDefault(b =>
            !b.IsAllDay && b.StartTime.HasValue && b.EndTime.HasValue &&
            b.StartTime.Value < dto.EndTime && b.EndTime.Value > dto.StartTime);
        if (partialBlock != null)
            return BadRequest(new { message = $"The doctor is unavailable during this time: {partialBlock.Reason}" });

        // Guard 3: no overlapping active appointments
        var activeStatuses = new[]
        {
            AppointmentStatus.Scheduled, AppointmentStatus.Confirmed,
            AppointmentStatus.CheckedIn, AppointmentStatus.InProgress, AppointmentStatus.WalkIn
        };
        var conflict = (await _uow.Appointments.FindAsync(
                a => a.DentistId == dto.DoctorId && a.AppointmentDate.Date == dto.AppointmentDate.Date
                     && activeStatuses.Contains(a.Status)))
            .Any(a => a.StartTime < dto.EndTime && a.EndTime > dto.StartTime);

        if (conflict)
            return BadRequest(new { message = "This time slot is no longer available. Please select another." });

        var appointment = new Appointment
        {
            PatientId       = patientId.Value,
            DentistId       = dto.DoctorId,
            AppointmentDate = dto.AppointmentDate.Date,
            StartTime       = dto.StartTime,
            EndTime         = dto.EndTime,
            Purpose         = dto.Purpose,
            Notes           = dto.Notes,
            TenantId        = tenantId,
            Status          = AppointmentStatus.Scheduled,
            CreatedDate     = DateTime.UtcNow,
        };

        await _uow.Appointments.AddAsync(appointment);
        await _uow.SaveChangesAsync();

        return Ok(new { message = "Appointment booked successfully.", id = appointment.Id });
    }
}

public record BookAppointmentDto(
    int DoctorId,
    DateTime AppointmentDate,
    TimeSpan StartTime,
    TimeSpan EndTime,
    string Purpose,
    string? Notes = null
);
