using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManagePatients)]
public class RecallController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _email;
    private readonly IAuditService _audit;

    public RecallController(IUnitOfWork uow, IEmailService email, IAuditService audit)
    {
        _uow = uow;
        _email = email;
        _audit = audit;
    }

    // GET api/recall?status=due|overdue|upcoming|completed&page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status = "due",
        [FromQuery] int? patientId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var today = DateTime.Today;

        var recalls = _uow.PatientRecalls.GetAll()
            .Include(r => r.Patient)
            .Include(r => r.CreatedByUser)
            .AsQueryable();

        if (patientId.HasValue)
            recalls = recalls.Where(r => r.PatientId == patientId.Value);

        recalls = status?.ToLower() switch
        {
            "overdue"  => recalls.Where(r => !r.IsCompleted && r.DueDate < today),
            "upcoming" => recalls.Where(r => !r.IsCompleted && r.DueDate >= today && r.DueDate <= today.AddDays(30)),
            "completed"=> recalls.Where(r => r.IsCompleted),
            _          => recalls.Where(r => !r.IsCompleted && r.DueDate <= today.AddDays(7)) // "due" = due within 7 days
        };

        var total = recalls.Count();
        var items = recalls
            .OrderBy(r => r.DueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id, r.DueDate, r.Reason, r.Notes,
                r.IsCompleted, r.CompletedDate,
                r.ReminderSent, r.ReminderSentDate, r.CreatedDate,
                Patient = new { r.Patient.Id, r.Patient.FullName, r.Patient.Email, r.Patient.PhoneNumber },
                CreatedBy = r.CreatedByUser.FullName
            })
            .ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/recall/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var recall = await _uow.PatientRecalls.GetByIdAsync(id);
        if (recall == null) return NotFound();
        return Ok(recall);
    }

    // POST api/recall
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRecallRequest req)
    {
        var patient = await _uow.Patients.GetByIdAsync(req.PatientId);
        if (patient == null) return NotFound("Patient not found.");

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var recall = new PatientRecall
        {
            PatientId = req.PatientId,
            CreatedByUserId = userId,
            DueDate = req.DueDate,
            Reason = req.Reason,
            Notes = req.Notes
        };

        await _uow.PatientRecalls.AddAsync(recall);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Create", "PatientRecall", recall.Id.ToString(),
            newValues: $"{{\"PatientId\":{req.PatientId},\"DueDate\":\"{req.DueDate:yyyy-MM-dd}\"}}");

        return CreatedAtAction(nameof(GetById), new { id = recall.Id }, new { recall.Id });
    }

    // PUT api/recall/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRecallRequest req)
    {
        var recall = await _uow.PatientRecalls.GetByIdAsync(id);
        if (recall == null) return NotFound();

        recall.DueDate = req.DueDate;
        recall.Reason = req.Reason;
        recall.Notes = req.Notes;

        _uow.PatientRecalls.Update(recall);
        await _uow.SaveChangesAsync();

        return Ok(new { recall.Id, recall.DueDate, recall.Reason, recall.Notes });
    }

    // POST api/recall/{id}/complete
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id, [FromQuery] int? appointmentId = null)
    {
        var recall = await _uow.PatientRecalls.GetByIdAsync(id);
        if (recall == null) return NotFound();
        if (recall.IsCompleted) return BadRequest("Recall already completed.");

        recall.IsCompleted = true;
        recall.CompletedDate = DateTime.UtcNow;
        recall.CompletedAppointmentId = appointmentId;

        _uow.PatientRecalls.Update(recall);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Update", "PatientRecall", id.ToString(),
            newValues: $"{{\"IsCompleted\":true,\"CompletedDate\":\"{recall.CompletedDate:yyyy-MM-dd}\"}}");

        return Ok(new { recall.Id, recall.IsCompleted, recall.CompletedDate });
    }

    // POST api/recall/{id}/send-reminder
    [HttpPost("{id}/send-reminder")]
    public async Task<IActionResult> SendReminder(int id)
    {
        var recall = _uow.PatientRecalls.GetAll()
            .Include(r => r.Patient)
            .FirstOrDefault(r => r.Id == id);

        if (recall == null) return NotFound();
        if (recall.IsCompleted) return BadRequest("Recall already completed.");

        // Send email using the welcome/general email approach
        var patient = recall.Patient;
        if (!string.IsNullOrWhiteSpace(patient.Email))
        {
            await _email.SendWelcomeEmailAsync(patient.Email,
                $"Recall Reminder — {patient.FullName}");
        }

        recall.ReminderSent = true;
        recall.ReminderSentDate = DateTime.UtcNow;
        _uow.PatientRecalls.Update(recall);
        await _uow.SaveChangesAsync();

        await _audit.LogAsync("SendEmail", "PatientRecall", id.ToString(),
            newValues: "{\"type\":\"RecallReminder\"}");

        return Ok(new { message = "Reminder sent.", recall.ReminderSentDate });
    }

    // DELETE api/recall/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var recall = await _uow.PatientRecalls.GetByIdAsync(id);
        if (recall == null) return NotFound();

        _uow.PatientRecalls.Remove(recall);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // GET api/recall/summary  — dashboard widget
    [HttpGet("summary")]
    public IActionResult GetSummary()
    {
        var today = DateTime.Today;
        var all = _uow.PatientRecalls.GetAll().ToList();

        return Ok(new
        {
            DueThisWeek = all.Count(r => !r.IsCompleted && r.DueDate >= today && r.DueDate <= today.AddDays(7)),
            Overdue = all.Count(r => !r.IsCompleted && r.DueDate < today),
            DueThisMonth = all.Count(r => !r.IsCompleted && r.DueDate >= today && r.DueDate <= today.AddDays(30)),
            CompletedThisMonth = all.Count(r => r.IsCompleted && r.CompletedDate >= today.AddDays(-30)),
            RemindersSentThisMonth = all.Count(r => r.ReminderSent && r.ReminderSentDate >= today.AddDays(-30))
        });
    }
}

public record CreateRecallRequest(int PatientId, DateTime DueDate, string Reason, string? Notes);
public record UpdateRecallRequest(DateTime DueDate, string Reason, string? Notes);
