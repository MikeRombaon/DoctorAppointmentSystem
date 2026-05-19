using DentalInformationSystem.API.Services;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/communication-log")]
[Authorize]
public class CommunicationLogController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public CommunicationLogController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    // GET api/communication-log?patientId=&type=&from=&to=
    [HttpGet]
    [Authorize(Policy = "CanManagePatients")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? patientId,
        [FromQuery] string? type,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var all = await _uow.CommunicationLogs.GetAllAsync();

        if (patientId.HasValue)
            all = all.Where(c => c.PatientId == patientId.Value);

        if (!string.IsNullOrWhiteSpace(type))
            all = all.Where(c => c.Type == type);

        if (from.HasValue)
            all = all.Where(c => c.SentDate >= from.Value);

        if (to.HasValue)
            all = all.Where(c => c.SentDate <= to.Value.AddDays(1));

        var ordered = all.OrderByDescending(c => c.SentDate).ToList();
        var total = ordered.Count;
        var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize);

        return Ok(new
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = paged.Select(c => new
            {
                c.Id, c.PatientId, c.Channel, c.Type, c.Recipient,
                c.Subject, c.Status, c.SentDate, c.RelatedEntityType, c.RelatedEntityId,
                c.SentByUserId, c.ErrorMessage
            })
        });
    }

    // GET api/communication-log/{id}
    [HttpGet("{id}")]
    [Authorize(Policy = "CanManagePatients")]
    public async Task<IActionResult> GetById(int id)
    {
        var log = await _uow.CommunicationLogs.GetByIdAsync(id);
        if (log == null) return NotFound();
        return Ok(log);
    }

    // GET api/communication-log/patient/{patientId}/summary
    [HttpGet("patient/{patientId}/summary")]
    [Authorize(Policy = "CanManagePatients")]
    public async Task<IActionResult> GetPatientSummary(int patientId)
    {
        var logs = await _uow.CommunicationLogs.FindAsync(c => c.PatientId == patientId);
        var list = logs.ToList();

        return Ok(new
        {
            Total = list.Count,
            ByType = list.GroupBy(c => c.Type)
                .Select(g => new { Type = g.Key, Count = g.Count() }),
            ByStatus = list.GroupBy(c => c.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() }),
            LastContact = list.OrderByDescending(c => c.SentDate).FirstOrDefault()?.SentDate
        });
    }

    // GET api/communication-log/types
    [HttpGet("types")]
    public IActionResult GetTypes()
    {
        return Ok(new[]
        {
            "AppointmentReminder", "InvoiceSent", "WelcomeEmail",
            "PasswordReset", "LowStockAlert", "ReminderBatch", "Custom"
        });
    }
}
