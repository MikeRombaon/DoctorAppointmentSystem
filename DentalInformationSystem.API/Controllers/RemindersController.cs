using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/reminders")]
[Authorize]
public class RemindersController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _email;
    private readonly IAuditService _audit;

    public RemindersController(IUnitOfWork uow, IEmailService email, IAuditService audit)
    {
        _uow = uow;
        _email = email;
        _audit = audit;
    }

    private int CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    // POST api/reminders/trigger
    [HttpPost("trigger")]
    [Authorize(Policy = "CanScheduleAppointments")]
    public async Task<IActionResult> TriggerBatchReminders([FromBody] TriggerReminderDto dto)
    {
        var targetDate = dto.TargetDate ?? DateTime.Today.AddDays(dto.DaysAhead ?? 1);
        var daysAhead = dto.DaysAhead ?? 1;

        var appointments = (await _uow.Appointments.FindAsync(
            a => a.AppointmentDate.Date == targetDate.Date &&
                 a.Status != Domain.Enums.AppointmentStatus.Cancelled))
            .ToList();

        int sent = 0;
        int failed = 0;
        string status = "Completed";

        foreach (var appt in appointments)
        {
            try
            {
                await _email.SendAppointmentReminderAsync(appt.Id);

                // Log each communication
                var patient = await _uow.Patients.GetByIdAsync(appt.PatientId);
                var log = new CommunicationLog
                {
                    PatientId = appt.PatientId,
                    Channel = "Email",
                    Type = "ReminderBatch",
                    Recipient = patient?.Email ?? string.Empty,
                    Subject = $"Appointment Reminder – {appt.AppointmentDate:MMM dd, yyyy}",
                    Status = "Sent",
                    RelatedEntityType = "Appointment",
                    RelatedEntityId = appt.Id,
                    SentByUserId = CurrentUserId
                };
                await _uow.CommunicationLogs.AddAsync(log);
                sent++;
            }
            catch
            {
                failed++;
            }
        }

        if (failed > 0)
            status = sent == 0 ? "Failed" : "PartialFailure";

        var reminderLog = new ReminderLog
        {
            ReminderDate = targetDate,
            DaysAhead = daysAhead,
            AppointmentsFound = appointments.Count,
            RemindersSent = sent,
            RemindersFailed = failed,
            Status = status,
            TriggeredByUserId = CurrentUserId,
            Notes = dto.Notes
        };

        await _uow.ReminderLogs.AddAsync(reminderLog);
        await _uow.SaveChangesAsync();

        await _audit.LogAsync("TriggerReminders", "ReminderLog", reminderLog.Id.ToString(),
            newValues: $"{{\"date\":\"{targetDate:yyyy-MM-dd}\",\"sent\":{sent},\"failed\":{failed}}}");

        return Ok(new
        {
            TargetDate = targetDate,
            AppointmentsFound = appointments.Count,
            RemindersSent = sent,
            RemindersFailed = failed,
            Status = status
        });
    }

    // GET api/reminders/log
    [HttpGet("log")]
    [Authorize(Policy = "CanScheduleAppointments")]
    public async Task<IActionResult> GetReminderLog(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var all = await _uow.ReminderLogs.GetAllAsync();

        if (from.HasValue)
            all = all.Where(r => r.ReminderDate >= from.Value);
        if (to.HasValue)
            all = all.Where(r => r.ReminderDate <= to.Value.AddDays(1));

        var ordered = all.OrderByDescending(r => r.CreatedDate).ToList();
        var total = ordered.Count;
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize);

        return Ok(new
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = paged.Select(r => new
            {
                r.Id, r.ReminderDate, r.DaysAhead, r.AppointmentsFound,
                r.RemindersSent, r.RemindersFailed, r.Status, r.Notes,
                r.TriggeredByUserId, r.CreatedDate
            })
        });
    }

    // GET api/reminders/log/summary
    [HttpGet("log/summary")]
    [Authorize(Policy = "CanScheduleAppointments")]
    public async Task<IActionResult> GetSummary()
    {
        var logs = await _uow.ReminderLogs.GetAllAsync();
        var list = logs.ToList();

        return Ok(new
        {
            TotalRuns = list.Count,
            TotalSent = list.Sum(r => r.RemindersSent),
            TotalFailed = list.Sum(r => r.RemindersFailed),
            LastRun = list.OrderByDescending(r => r.CreatedDate).FirstOrDefault()?.CreatedDate,
            ByStatus = list.GroupBy(r => r.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
        });
    }
}

public class TriggerReminderDto
{
    public DateTime? TargetDate { get; set; }
    public int? DaysAhead { get; set; } = 1;
    public string? Notes { get; set; }
}
