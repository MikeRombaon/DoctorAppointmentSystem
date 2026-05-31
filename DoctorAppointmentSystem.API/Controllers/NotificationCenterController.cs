using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/notifications/inbox")]
[Authorize]
public class NotificationCenterController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly TenantContext _tenantContext;

    public NotificationCenterController(IUnitOfWork uow, IAuditService audit, TenantContext tenantContext)
    {
        _uow = uow;
        _audit = audit;
        _tenantContext = tenantContext;
    }

    private int CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    // GET api/notifications/inbox
    [HttpGet]
    public async Task<IActionResult> GetMyNotifications([FromQuery] bool? unreadOnly = null)
    {
        var userId = CurrentUserId;
        var all = await _uow.Notifications.FindAsync(n => n.UserId == userId);

        if (unreadOnly == true)
            all = all.Where(n => !n.IsRead);

        var result = all
            .OrderByDescending(n => n.CreatedDate)
            .Select(n => new
            {
                n.Id, n.Title, n.Message, n.Type, n.EntityType, n.EntityId,
                n.IsRead, n.CreatedDate, n.ReadDate
            });

        return Ok(result);
    }

    // GET api/notifications/inbox/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = CurrentUserId;
        var notifications = await _uow.Notifications.FindAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { count = notifications.Count() });
    }

    // PUT api/notifications/inbox/{id}/read
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var notification = await _uow.Notifications.GetByIdAsync(id);
        if (notification == null || notification.UserId != CurrentUserId)
            return NotFound();

        notification.IsRead = true;
        notification.ReadDate = DateTime.UtcNow;
        await _uow.SaveChangesAsync();

        return Ok(new { message = "Notification marked as read." });
    }

    // PUT api/notifications/inbox/read-all
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = CurrentUserId;
        var unread = await _uow.Notifications.FindAsync(n => n.UserId == userId && !n.IsRead);

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadDate = DateTime.UtcNow;
        }

        await _uow.SaveChangesAsync();
        return Ok(new { message = "All notifications marked as read." });
    }

    // DELETE api/notifications/inbox/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var notification = await _uow.Notifications.GetByIdAsync(id);
        if (notification == null || notification.UserId != CurrentUserId)
            return NotFound();

        _uow.Notifications.Remove(notification);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // POST api/notifications/inbox/send (admin: broadcast to role or specific user)
    [HttpPost("send")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> SendNotification([FromBody] SendNotificationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest("Title and message are required.");

        var targetUsers = new List<int>();

        if (dto.UserId.HasValue)
        {
            targetUsers.Add(dto.UserId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(dto.TargetRole))
        {
            var users = await _uow.Users.GetAllAsync();
            targetUsers = users
                .Where(u => u.Role.ToString() == dto.TargetRole && u.IsActive)
                .Select(u => u.Id)
                .ToList();
        }
        else
        {
            // Broadcast to all active staff
            var users = await _uow.Users.GetAllAsync();
            targetUsers = users.Where(u => u.IsActive).Select(u => u.Id).ToList();
        }

        foreach (var uid in targetUsers)
        {
            var notification = new Notification
            {
                UserId = uid,
                Title = dto.Title,
                Message = dto.Message,
                Type = dto.Type ?? "Info",
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                TenantId = _tenantContext.TenantId ?? 0
            };
            await _uow.Notifications.AddAsync(notification);
        }

        await _uow.SaveChangesAsync();
        await _audit.LogAsync("SendNotification", "Notification", null,
            newValues: $"{{\"recipients\":{targetUsers.Count},\"title\":\"{dto.Title}\"}}");

        return Ok(new { message = $"Notification sent to {targetUsers.Count} user(s)." });
    }
}

public class SendNotificationDto
{
    public int? UserId { get; set; }
    public string? TargetRole { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
}
