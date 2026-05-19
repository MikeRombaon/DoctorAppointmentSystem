using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "CanManageUsers")]
public class AuditController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public AuditController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    // GET api/audit?page=1&pageSize=50&entityType=Patient&action=Update&userId=3&from=2025-01-01&to=2025-12-31
    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? entityType = null,
        [FromQuery] string? action = null,
        [FromQuery] int? userId = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] bool? successOnly = null)
    {
        var all = (await _uow.AuditLogs.GetAllAsync())
            .OrderByDescending(a => a.Timestamp)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            all = all.Where(a => a.EntityType.Equals(entityType, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(action))
            all = all.Where(a => a.Action.Equals(action, StringComparison.OrdinalIgnoreCase));

        if (userId.HasValue)
            all = all.Where(a => a.UserId == userId);

        if (from.HasValue)
            all = all.Where(a => a.Timestamp >= from.Value.ToUniversalTime());

        if (to.HasValue)
            all = all.Where(a => a.Timestamp <= to.Value.ToUniversalTime().AddDays(1));

        if (successOnly.HasValue)
            all = all.Where(a => a.Success == successOnly.Value);

        var total = all.Count();
        var items = all.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new
            {
                a.Id, a.Timestamp, a.UserName, a.UserRole,
                a.Action, a.EntityType, a.EntityId,
                a.OldValues, a.NewValues, a.IpAddress, a.Success, a.FailureReason
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/audit/{id}
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var log = await _uow.AuditLogs.GetByIdAsync((int)id);
        if (log == null) return NotFound();
        return Ok(log);
    }

    // GET api/audit/entity/{entityType}/{entityId}
    [HttpGet("entity/{entityType}/{entityId}")]
    public async Task<IActionResult> GetByEntity(string entityType, string entityId)
    {
        var logs = (await _uow.AuditLogs.FindAsync(
            a => a.EntityType == entityType && a.EntityId == entityId))
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new
            {
                a.Id, a.Timestamp, a.UserName, a.UserRole,
                a.Action, a.OldValues, a.NewValues, a.Success
            }).ToList();

        return Ok(logs);
    }

    // GET api/audit/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var all = await _uow.AuditLogs.GetAllAsync();
        var grouped = all
            .GroupBy(a => a.EntityType)
            .Select(g => new { EntityType = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToList();

        var recentFailed = all.Where(a => !a.Success)
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .Select(a => new { a.Id, a.Timestamp, a.UserName, a.Action, a.EntityType, a.FailureReason })
            .ToList();

        return Ok(new
        {
            TotalLogs = all.Count(),
            ByEntityType = grouped,
            RecentFailures = recentFailed
        });
    }
}
