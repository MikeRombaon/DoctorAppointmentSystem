using DoctorAppointmentSystem.API.Services;
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
[Authorize(Roles = "SuperAdmin,Admin,ClinicalStaff")]
public class SchedulingController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly TenantContext _tenantContext;

    public SchedulingController(IUnitOfWork uow, IAuditService audit, TenantContext tenantContext)
    {
        _uow = uow;
        _audit = audit;
        _tenantContext = tenantContext;
    }

    // ─── Doctor Schedules ───────────────────────────────────────────────────

    [HttpGet("schedules")]
    public async Task<IActionResult> GetSchedules([FromQuery] int? doctorId, [FromQuery] int? branchId)
    {
        var query = _uow.DentistSchedules.GetAll()
            .Include(s => s.Dentist)
            .Include(s => s.Branch)
            .AsQueryable();

        if (doctorId.HasValue) query = query.Where(s => s.DentistId == doctorId);
        if (branchId.HasValue) query = query.Where(s => s.BranchId == branchId);

        var schedules = await query
            .OrderBy(s => s.DentistId)
            .ThenBy(s => s.DayOfWeek)
            .Select(s => new
            {
                s.Id, DoctorId = s.DentistId,
                DoctorName = s.Dentist.FullName,
                s.BranchId,
                BranchName = s.Branch != null ? s.Branch.Name : null,
                s.DayOfWeek,
                StartTime = s.StartTime.ToString(@"hh\:mm"),
                EndTime = s.EndTime.ToString(@"hh\:mm"),
                s.IsAvailable, s.SlotDurationMinutes
            })
            .ToListAsync();

        return Ok(schedules);
    }

    [HttpPost("schedules")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpsertSchedule([FromBody] UpsertScheduleRequest req)
    {
        var existing = await _uow.DentistSchedules.GetAll()
            .FirstOrDefaultAsync(s => s.DentistId == req.DoctorId && s.DayOfWeek == req.DayOfWeek
                                   && s.BranchId == req.BranchId);

        if (existing != null)
        {
            existing.StartTime = TimeSpan.Parse(req.StartTime);
            existing.EndTime = TimeSpan.Parse(req.EndTime);
            existing.IsAvailable = req.IsAvailable;
            existing.SlotDurationMinutes = req.SlotDurationMinutes;
            existing.ModifiedDate = DateTime.UtcNow;
            _uow.DentistSchedules.Update(existing);
        }
        else
        {
            var schedule = new DentistSchedule
            {
                DentistId = req.DoctorId,
                BranchId = req.BranchId,
                DayOfWeek = req.DayOfWeek,
                StartTime = TimeSpan.Parse(req.StartTime),
                EndTime = TimeSpan.Parse(req.EndTime),
                IsAvailable = req.IsAvailable,
                SlotDurationMinutes = req.SlotDurationMinutes,
                TenantId = _tenantContext.TenantId ?? 0
            };
            await _uow.DentistSchedules.AddAsync(schedule);
        }

        await _uow.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("schedules/{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var schedule = await _uow.DentistSchedules.GetByIdAsync(id);
        if (schedule == null) return NotFound();
        _uow.DentistSchedules.Remove(schedule);
        await _uow.SaveChangesAsync();
        return NoContent();
    }

    // ─── Schedule Blocks (time-off / one-off blocks) ─────────────────────────

    [HttpGet("blocks")]
    public async Task<IActionResult> GetBlocks([FromQuery] int? doctorId, [FromQuery] int? branchId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _uow.ScheduleBlocks.GetAll()
            .Include(b => b.Dentist)
            .Include(b => b.Branch)
            .AsQueryable();

        if (doctorId.HasValue) query = query.Where(b => b.DentistId == doctorId);
        if (branchId.HasValue) query = query.Where(b => b.BranchId == branchId);
        if (from.HasValue) query = query.Where(b => b.BlockDate >= from.Value);
        if (to.HasValue) query = query.Where(b => b.BlockDate <= to.Value);

        var blocks = await query
            .OrderBy(b => b.BlockDate)
            .Select(b => new
            {
                b.Id, DoctorId = b.DentistId,
                DoctorName = b.Dentist.FullName,
                b.BranchId,
                BranchName = b.Branch != null ? b.Branch.Name : null,
                b.BlockDate, b.IsAllDay, b.Reason,
                StartTime = b.StartTime.HasValue ? b.StartTime.Value.ToString(@"hh\:mm") : null,
                EndTime = b.EndTime.HasValue ? b.EndTime.Value.ToString(@"hh\:mm") : null,
            })
            .ToListAsync();

        return Ok(blocks);
    }

    [HttpPost("blocks")]
    public async Task<IActionResult> CreateBlock([FromBody] CreateBlockRequest req)
    {
        var block = new ScheduleBlock
        {
            DentistId = req.DoctorId,
            BranchId = req.BranchId,
            BlockDate = req.BlockDate,
            IsAllDay = req.IsAllDay,
            Reason = req.Reason,
            StartTime = req.IsAllDay ? null : (req.StartTime != null ? TimeSpan.Parse(req.StartTime) : null),
            EndTime = req.IsAllDay ? null : (req.EndTime != null ? TimeSpan.Parse(req.EndTime) : null),
            TenantId = _tenantContext.TenantId ?? 0
        };
        await _uow.ScheduleBlocks.AddAsync(block);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Created", "ScheduleBlock", block.Id.ToString(), $"Block added for doctor {req.DoctorId} on {req.BlockDate:yyyy-MM-dd}.");
        return Ok(new { block.Id });
    }

    [HttpDelete("blocks/{id}")]
    public async Task<IActionResult> DeleteBlock(int id)
    {
        var block = await _uow.ScheduleBlocks.GetByIdAsync(id);
        if (block == null) return NotFound();
        _uow.ScheduleBlocks.Remove(block);
        await _uow.SaveChangesAsync();
        return NoContent();
    }

    // ─── Available Slots ─────────────────────────────────────────────────────
    // Accessible by all authenticated users (patients, staff, admins) so that
    // the patient portal can show the exact same availability grid as staff.

    [HttpGet("slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailableSlots([FromQuery] int doctorId, [FromQuery] DateTime date,
        [FromQuery] int? branchId)
    {
        // Require at least an authenticated user (AllowAnonymous lifts the class-level
        // role guard but we still reject unauthenticated callers).
        if (!User.Identity?.IsAuthenticated ?? false)
            return Unauthorized();

        var dayOfWeek = date.DayOfWeek;

        // 1. Weekly schedule — fall back to 09:00–17:00 / 30-min if none configured.
        var schedule = await _uow.DentistSchedules.GetAll()
            .FirstOrDefaultAsync(s => s.DentistId == doctorId && s.DayOfWeek == dayOfWeek
                                   && (branchId == null || s.BranchId == branchId) && s.IsAvailable);

        var scheduleStart  = schedule?.StartTime          ?? new TimeSpan(9, 0, 0);
        var scheduleEnd    = schedule?.EndTime            ?? new TimeSpan(17, 0, 0);
        int slotDuration   = schedule?.SlotDurationMinutes ?? 30;

        // 2. All-day block (emergency leave, day off, etc.)
        var blocks = await _uow.ScheduleBlocks.GetAll()
            .Where(b => b.DentistId == doctorId && b.BlockDate.Date == date.Date)
            .ToListAsync();

        var allDayBlock = blocks.FirstOrDefault(b => b.IsAllDay);
        if (allDayBlock != null)
            return Ok(new
            {
                available = false,
                slotDurationMinutes = slotDuration,
                slots = Array.Empty<object>(),
                reason = $"The doctor is unavailable: {allDayBlock.Reason}"
            });

        // 3. Active appointments on this day (exclude cancelled / no-show).
        var activeStatuses = new[]
        {
            AppointmentStatus.Scheduled, AppointmentStatus.Confirmed,
            AppointmentStatus.CheckedIn, AppointmentStatus.InProgress, AppointmentStatus.WalkIn
        };

        var existingAppts = await _uow.Appointments.GetAll()
            .Where(a => a.DentistId == doctorId && a.AppointmentDate.Date == date.Date
                        && activeStatuses.Contains(a.Status))
            .Select(a => new { a.StartTime, a.EndTime })
            .ToListAsync();

        // 4. Generate slots and exclude partial blocks + booked slots.
        var slots = new List<object>();
        var current = scheduleStart;

        while (current + TimeSpan.FromMinutes(slotDuration) <= scheduleEnd)
        {
            var slotEnd = current + TimeSpan.FromMinutes(slotDuration);

            bool partialBlocked = blocks.Any(b =>
                !b.IsAllDay && b.StartTime.HasValue && b.EndTime.HasValue &&
                b.StartTime.Value < slotEnd && b.EndTime.Value > current);

            bool booked = existingAppts.Any(a => a.StartTime < slotEnd && a.EndTime > current);

            if (!partialBlocked && !booked)
                slots.Add(new
                {
                    startTime = current.ToString(@"hh\:mm"),
                    endTime   = slotEnd.ToString(@"hh\:mm")
                });

            current += TimeSpan.FromMinutes(slotDuration);
        }

        return Ok(new
        {
            available           = slots.Count > 0,
            slotDurationMinutes = slotDuration,
            slots,
            reason              = slots.Count == 0
                ? "No available slots for this doctor on the selected date."
                : (string?)null
        });
    }
}

public record UpsertScheduleRequest(
    int DoctorId, int? BranchId, DayOfWeek DayOfWeek,
    string StartTime, string EndTime, bool IsAvailable, int SlotDurationMinutes);

public record CreateBlockRequest(
    int DoctorId, int? BranchId, DateTime BlockDate, bool IsAllDay,
    string Reason, string? StartTime, string? EndTime);

