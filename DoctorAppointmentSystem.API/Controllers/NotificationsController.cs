using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _email;
    private readonly IAuditService _audit;

    public NotificationsController(IUnitOfWork uow, IEmailService email, IAuditService audit)
    {
        _uow = uow;
        _email = email;
        _audit = audit;
    }

    // ── Send Actions ──────────────────────────────────────

    // POST api/notifications/appointment-reminder/{appointmentId}
    [HttpPost("appointment-reminder/{appointmentId}")]
    [Authorize(Policy = "CanScheduleAppointments")]
    public async Task<IActionResult> SendAppointmentReminder(int appointmentId)
    {
        var appt = await _uow.Appointments.GetByIdAsync(appointmentId);
        if (appt == null) return NotFound();

        await _email.SendAppointmentReminderAsync(appointmentId);
        await _audit.LogAsync("SendEmail", "Appointment", appointmentId.ToString(),
            newValues: "{\"type\":\"AppointmentReminder\"}");

        return Ok(new { message = "Appointment reminder sent." });
    }

    // POST api/notifications/invoice/{invoiceId}
    [HttpPost("invoice/{invoiceId}")]
    [Authorize(Policy = "CanProcessBilling")]
    public async Task<IActionResult> SendInvoiceEmail(int invoiceId)
    {
        var invoice = await _uow.Invoices.GetByIdAsync(invoiceId);
        if (invoice == null) return NotFound();

        await _email.SendInvoiceAsync(invoiceId);
        await _audit.LogAsync("SendEmail", "Invoice", invoiceId.ToString(),
            newValues: "{\"type\":\"InvoiceEmail\"}");

        return Ok(new { message = "Invoice email sent." });
    }

    // ── Notification Templates CRUD ───────────────────────

    // GET api/notifications/templates
    [HttpGet("templates")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> GetTemplates()
    {
        var templates = await _uow.NotificationTemplates.GetAllAsync();
        return Ok(templates.Select(t => new
        {
            t.Id, t.Name, t.Subject, t.IsActive, t.CreatedDate, t.ModifiedDate
        }));
    }

    // GET api/notifications/templates/{id}
    [HttpGet("templates/{id}")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> GetTemplate(int id)
    {
        var template = await _uow.NotificationTemplates.GetByIdAsync(id);
        if (template == null) return NotFound();
        return Ok(template);
    }

    // POST api/notifications/templates
    [HttpPost("templates")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTemplateRequest req)
    {
        var existing = (await _uow.NotificationTemplates.FindAsync(t => t.Name == req.Name)).FirstOrDefault();
        if (existing != null) return Conflict("A template with this name already exists.");

        var template = new NotificationTemplate
        {
            Name = req.Name,
            Subject = req.Subject,
            BodyHtml = req.BodyHtml,
            IsActive = true
        };

        await _uow.NotificationTemplates.AddAsync(template);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Create", "NotificationTemplate", template.Id.ToString(),
            newValues: $"{{\"Name\":\"{template.Name}\"}}");

        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
    }

    // PUT api/notifications/templates/{id}
    [HttpPut("templates/{id}")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> UpdateTemplate(int id, [FromBody] CreateTemplateRequest req)
    {
        var template = await _uow.NotificationTemplates.GetByIdAsync(id);
        if (template == null) return NotFound();

        var old = $"{{\"Subject\":\"{template.Subject}\"}}";
        template.Subject = req.Subject;
        template.BodyHtml = req.BodyHtml;
        template.ModifiedDate = DateTime.UtcNow;

        _uow.NotificationTemplates.Update(template);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Update", "NotificationTemplate", id.ToString(),
            oldValues: old, newValues: $"{{\"Subject\":\"{template.Subject}\"}}");

        return Ok(template);
    }

    // DELETE api/notifications/templates/{id}
    [HttpDelete("templates/{id}")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        var template = await _uow.NotificationTemplates.GetByIdAsync(id);
        if (template == null) return NotFound();

        _uow.NotificationTemplates.Remove(template);
        await _uow.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateTemplateRequest(string Name, string Subject, string BodyHtml);
