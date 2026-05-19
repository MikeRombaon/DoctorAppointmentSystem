using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace DentalInformationSystem.API.Services;

public class AuditService : IAuditService
{
    private readonly IUnitOfWork _uow;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(IUnitOfWork uow, IHttpContextAccessor httpContextAccessor)
    {
        _uow = uow;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(string action, string entityType, string? entityId = null,
        string? oldValues = null, string? newValues = null, bool success = true, string? failureReason = null)
    {
        var http = _httpContextAccessor.HttpContext;
        var user = http?.User;

        int? userId = null;
        if (int.TryParse(user?.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed))
            userId = parsed;

        var entry = new AuditLog
        {
            UserId = userId,
            UserName = user?.FindFirstValue(ClaimTypes.Name),
            UserRole = user?.FindFirstValue(ClaimTypes.Role),
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldValues,
            NewValues = newValues,
            IpAddress = http?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = http?.Request.Headers["User-Agent"].ToString(),
            Success = success,
            FailureReason = failureReason,
            Timestamp = DateTime.UtcNow
        };

        await _uow.AuditLogs.AddAsync(entry);
        await _uow.SaveChangesAsync();
    }
}
