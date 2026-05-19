namespace DentalInformationSystem.API.Services;

public interface IAuditService
{
    Task LogAsync(string action, string entityType, string? entityId = null,
        string? oldValues = null, string? newValues = null, bool success = true, string? failureReason = null);
}
