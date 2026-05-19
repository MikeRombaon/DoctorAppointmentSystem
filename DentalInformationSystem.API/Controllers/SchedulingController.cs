using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,ClinicalStaff")]
public class SchedulingController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public SchedulingController(IUnitOfWork uow, IAuditService audit)
    {
        _uow = uow;
        _audit = audit;
    }

    // ─── Dentist Schedules ───────────────────────────────────────────────────

    [HttpGet("schedules")]
    public async Task<IActionResult> GetSchedules([FromQuery] int? dentistId, [FromQuery] int? branchId)
    {
        var query = _uow.DentistSchedules.GetAll()
            .Include(s => s.Dentist)
            .Include(s => s.Branch)
            .AsQueryable();

        if (dentistId.HasValue) query = query.Where(s => s.DentistId == dentistId);
        if (branchId.HasValue) query = query.Where(s => s.BranchId == branchId);

        var schedules = await query
            .OrderBy(s => s.DentistId)
            .ThenBy(s => s.DayOfWeek)
            .Select(s => new
            {
                s.Id, s.DentistId,
                DentistName = s.Dentist.FullName,
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
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpsertSchedule([FromBody] UpsertScheduleRequest req)
    {
        var existing = await _uow.DentistSchedules.GetAll()
            .FirstOrDefaultAsync(s => s.DentistId == req.DentistId && s.DayOfWeek == req.DayOfWeek
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
                DentistId = req.DentistId,
                BranchId = req.BranchId,
                DayOfWeek = req.DayOfWeek,
                StartTime = TimeSpan.Parse(req.StartTime),
                EndTime = TimeSpan.Parse(req.EndTime),
                IsAvailable = req.IsAvailable,
                SlotDurationMinutes = req.SlotDurationMinutes
            };
            await _uow.DentistSchedules.AddAsync(schedule);
        }

        await _uow.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("schedules/{id}")]
    [Authorize(Roles = "Admin")]
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
    public async Task<IActionResult> GetBlocks([FromQuery] int? dentistId, [FromQuery] int? branchId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _uow.ScheduleBlocks.GetAll()
            .Include(b => b.Dentist)
            .Include(b => b.Branch)
            .AsQueryable();

        if (dentistId.HasValue) query = query.Where(b => b.DentistId == dentistId);
        if (branchId.HasValue) query = query.Where(b => b.BranchId == branchId);
        if (from.HasValue) query = query.Where(b => b.BlockDate >= from.Value);
        if (to.HasValue) query = query.Where(b => b.BlockDate <= to.Value);

        var blocks = await query
            .OrderBy(b => b.BlockDate)
            .Select(b => new
            {
                b.Id, b.DentistId,
                DentistName = b.Dentist.FullName,
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
            DentistId = req.DentistId,
            BranchId = req.BranchId,
            BlockDate = req.BlockDate,
            IsAllDay = req.IsAllDay,
            Reason = req.Reason,
            StartTime = req.IsAllDay ? null : (req.StartTime != null ? TimeSpan.Parse(req.StartTime) : null),
            EndTime = req.IsAllDay ? null : (req.EndTime != null ? TimeSpan.Parse(req.EndTime) : null)
        };
        await _uow.ScheduleBlocks.AddAsync(block);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Created", "ScheduleBlock", block.Id.ToString(), $"Block added for dentist {req.DentistId} on {req.BlockDate:yyyy-MM-dd}.");
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

    // ─── Available Slots ──────────────────────────────────────────────────────

    [HttpGet("slots")]
    public async Task<IActionResult> GetAvailableSlots([FromQuery] int dentistId, [FromQuery] DateTime date,
        [FromQuery] int? branchId)
    {
        var dayOfWeek = date.DayOfWeek;

        var schedule = await _uow.DentistSchedules.GetAll()
            .FirstOrDefaultAsync(s => s.DentistId == dentistId && s.DayOfWeek == dayOfWeek
                                   && (branchId == null || s.BranchId == branchId) && s.IsAvailable);

        if (schedule == null) return Ok(new { slots = Array.Empty<string>() });

        // Check blocks
        var blocked = await _uow.ScheduleBlocks.GetAll()
            .AnyAsync(b => b.DentistId == dentistId && b.BlockDate.Date == date.Date
                        && (b.IsAllDay || (b.StartTime == null && b.EndTime == null)));

        if (blocked) return Ok(new { slots = Array.Empty<string>() });

        // Generate slots
        var slots = new List<string>();
        var current = schedule.StartTime;
        while (current + TimeSpan.FromMinutes(schedule.SlotDurationMinutes) <= schedule.EndTime)
        {
            // Check if slot is already booked
            var slotStart = date.Date + current;
            var slotEnd = slotStart.AddMinutes(schedule.SlotDurationMinutes);
            var booked = await _uow.Appointments.GetAll()
                .AnyAsync(a => a.DentistId == dentistId && a.AppointmentDate.Date == date.Date
                            && a.StartTime < TimeSpan.FromMinutes((slotEnd - date.Date).TotalMinutes)
                            && a.EndTime > current);

            if (!booked) slots.Add(current.ToString(@"hh\:mm"));
            current = current.Add(TimeSpan.FromMinutes(schedule.SlotDurationMinutes));
        }

        return Ok(new { slots });
    }
}

public record UpsertScheduleRequest(
    int DentistId, int? BranchId, DayOfWeek DayOfWeek,
    string StartTime, string EndTime, bool IsAvailable, int SlotDurationMinutes);

public record CreateBlockRequest(
    int DentistId, int? BranchId, DateTime BlockDate, bool IsAllDay,
    string Reason, string? StartTime, string? EndTime);

