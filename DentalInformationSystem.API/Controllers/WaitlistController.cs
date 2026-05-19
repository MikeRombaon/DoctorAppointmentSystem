using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,ClinicalStaff,SupportStaff")]
public class WaitlistController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public WaitlistController(IUnitOfWork uow, IAuditService audit)
    {
        _uow = uow;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? pending = null,
        [FromQuery] int? patientId = null, [FromQuery] int? branchId = null)
    {
        var query = _uow.AppointmentWaitlists.GetAll()
            .Include(w => w.Patient)
            .Include(w => w.PreferredDentist)
            .Include(w => w.Branch)
            .AsQueryable();

        if (pending.HasValue) query = query.Where(w => !w.IsScheduled == pending.Value);
        if (patientId.HasValue) query = query.Where(w => w.PatientId == patientId);
        if (branchId.HasValue) query = query.Where(w => w.BranchId == branchId);

        var items = await query
            .OrderByDescending(w => w.IsUrgent)
            .ThenBy(w => w.RequestedDate)
            .Select(w => new
            {
                w.Id, w.PatientId,
                PatientName = w.Patient.FullName,
                PatientPhone = w.Patient.PhoneNumber,
                w.PreferredDentistId,
                DentistName = w.PreferredDentist != null ? w.PreferredDentist.FullName : null,
                w.BranchId,
                BranchName = w.Branch != null ? w.Branch.Name : null,
                w.Reason, w.RequestedDate, w.PreferredDateFrom, w.PreferredDateTo,
                w.PreferredTimeOfDay, w.IsUrgent, w.IsScheduled, w.ScheduledDate, w.Notes
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWaitlistRequest req)
    {
        var entry = new AppointmentWaitlist
        {
            PatientId = req.PatientId,
            PreferredDentistId = req.PreferredDentistId,
            BranchId = req.BranchId,
            Reason = req.Reason,
            PreferredDateFrom = req.PreferredDateFrom,
            PreferredDateTo = req.PreferredDateTo,
            PreferredTimeOfDay = req.PreferredTimeOfDay,
            IsUrgent = req.IsUrgent,
            Notes = req.Notes
        };

        await _uow.AppointmentWaitlists.AddAsync(entry);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Created", "Waitlist", entry.Id.ToString(), $"Patient {req.PatientId} added to waitlist.");

        return Ok(new { entry.Id });
    }

    [HttpPatch("{id}/schedule")]
    public async Task<IActionResult> MarkScheduled(int id, [FromBody] ScheduleWaitlistRequest req)
    {
        var entry = await _uow.AppointmentWaitlists.GetByIdAsync(id);
        if (entry == null) return NotFound();

        entry.IsScheduled = true;
        entry.ScheduledAppointmentId = req.AppointmentId;
        entry.ScheduledDate = req.ScheduledDate;

        _uow.AppointmentWaitlists.Update(entry);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Scheduled", "Waitlist", id.ToString(), $"Waitlist entry {id} scheduled for {req.ScheduledDate:yyyy-MM-dd}.");

        return Ok();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateWaitlistRequest req)
    {
        var entry = await _uow.AppointmentWaitlists.GetByIdAsync(id);
        if (entry == null) return NotFound();

        entry.Reason = req.Reason;
        entry.PreferredDentistId = req.PreferredDentistId;
        entry.BranchId = req.BranchId;
        entry.PreferredDateFrom = req.PreferredDateFrom;
        entry.PreferredDateTo = req.PreferredDateTo;
        entry.PreferredTimeOfDay = req.PreferredTimeOfDay;
        entry.IsUrgent = req.IsUrgent;
        entry.Notes = req.Notes;

        _uow.AppointmentWaitlists.Update(entry);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entry = await _uow.AppointmentWaitlists.GetByIdAsync(id);
        if (entry == null) return NotFound();

        _uow.AppointmentWaitlists.Remove(entry);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Removed", "Waitlist", id.ToString(), $"Waitlist entry {id} removed.");

        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var all = await _uow.AppointmentWaitlists.GetAll().ToListAsync();
        return Ok(new
        {
            total = all.Count,
            pending = all.Count(w => !w.IsScheduled),
            urgent = all.Count(w => !w.IsScheduled && w.IsUrgent),
            scheduled = all.Count(w => w.IsScheduled)
        });
    }
}

public record CreateWaitlistRequest(
    int PatientId, int? PreferredDentistId, int? BranchId,
    string Reason, DateTime? PreferredDateFrom, DateTime? PreferredDateTo,
    string? PreferredTimeOfDay, bool IsUrgent, string? Notes);

public record ScheduleWaitlistRequest(int? AppointmentId, DateTime ScheduledDate);

