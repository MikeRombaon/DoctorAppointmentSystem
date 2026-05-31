using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin,ClinicalStaff")]
public class LabOrdersController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly TenantContext _tenantContext;

    public LabOrdersController(IUnitOfWork uow, IAuditService audit, TenantContext tenantContext)
    {
        _uow = uow;
        _audit = audit;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null, [FromQuery] int? patientId = null,
        [FromQuery] int? dentistId = null, [FromQuery] string? search = null)
    {
        var query = _uow.LabOrders.GetAll()
            .Include(l => l.Patient)
            .Include(l => l.OrderedByDentist)
            .Include(l => l.Branch)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<LabOrderStatus>(status, true, out var s))
            query = query.Where(l => l.Status == s);
        if (patientId.HasValue)
            query = query.Where(l => l.PatientId == patientId);
        if (dentistId.HasValue)
            query = query.Where(l => l.OrderedByDentistId == dentistId);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(l => l.OrderNumber.Contains(search) || l.LabName.Contains(search)
                || l.WorkType.Contains(search) || l.Patient.LastName.Contains(search)
                || l.Patient.FirstName.Contains(search));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.OrderDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => new
            {
                l.Id, l.OrderNumber, l.Status,
                l.PatientId, PatientName = l.Patient.FullName,
                l.OrderedByDentistId, DentistName = l.OrderedByDentist.FullName,
                l.BranchId, BranchName = l.Branch != null ? l.Branch.Name : null,
                l.LabName, l.WorkType, l.ToothNumbers, l.Shade,
                l.OrderDate, l.DueDate, l.ReceivedDate,
                l.EstimatedCost, l.ActualCost, l.TrackingNumber
            })
            .ToListAsync();

        return Ok(new { totalCount = total, items });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var lab = await _uow.LabOrders.GetAll()
            .Include(l => l.Patient)
            .Include(l => l.OrderedByDentist)
            .Include(l => l.Branch)
            .Include(l => l.Treatment)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lab == null) return NotFound();

        return Ok(new
        {
            lab.Id, lab.OrderNumber, lab.Status,
            lab.PatientId, PatientName = lab.Patient.FullName,
            lab.OrderedByDentistId, DentistName = lab.OrderedByDentist.FullName,
            lab.TreatmentId, lab.BranchId, BranchName = lab.Branch?.Name,
            lab.LabName, lab.WorkType, lab.ToothNumbers, lab.Shade, lab.Instructions,
            lab.OrderDate, lab.DueDate, lab.ReceivedDate,
            lab.EstimatedCost, lab.ActualCost, lab.TrackingNumber, lab.Notes
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLabOrderRequest req)
    {
        var orderNumber = $"LAB-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
        var dentistId = GetCurrentUserId() ?? req.OrderedByDentistId;

        var lab = new LabOrder
        {
            OrderNumber = orderNumber,
            PatientId = req.PatientId,
            TreatmentId = req.TreatmentId,
            OrderedByDentistId = dentistId,
            BranchId = req.BranchId,
            LabName = req.LabName,
            WorkType = req.WorkType,
            ToothNumbers = req.ToothNumbers,
            Shade = req.Shade,
            Instructions = req.Instructions,
            Status = LabOrderStatus.Ordered,
            OrderDate = DateTime.UtcNow,
            DueDate = req.DueDate,
            EstimatedCost = req.EstimatedCost,
            Notes = req.Notes,
            TenantId = _tenantContext.TenantId ?? 0
        };

        await _uow.LabOrders.AddAsync(lab);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Created", "LabOrder", lab.Id.ToString(), $"Lab order '{orderNumber}' created for patient {req.PatientId}.");

        return CreatedAtAction(nameof(GetById), new { id = lab.Id }, new { lab.Id, lab.OrderNumber });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLabOrderRequest req)
    {
        var lab = await _uow.LabOrders.GetByIdAsync(id);
        if (lab == null) return NotFound();

        lab.LabName = req.LabName;
        lab.WorkType = req.WorkType;
        lab.ToothNumbers = req.ToothNumbers;
        lab.Shade = req.Shade;
        lab.Instructions = req.Instructions;
        lab.DueDate = req.DueDate;
        lab.EstimatedCost = req.EstimatedCost;
        lab.TrackingNumber = req.TrackingNumber;
        lab.Notes = req.Notes;
        lab.ModifiedDate = DateTime.UtcNow;

        _uow.LabOrders.Update(lab);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateLabStatusRequest req)
    {
        var lab = await _uow.LabOrders.GetByIdAsync(id);
        if (lab == null) return NotFound();

        lab.Status = req.Status;
        if (req.Status == LabOrderStatus.Received)
            lab.ReceivedDate = DateTime.UtcNow;
        if (req.ActualCost.HasValue)
            lab.ActualCost = req.ActualCost;
        if (!string.IsNullOrEmpty(req.TrackingNumber))
            lab.TrackingNumber = req.TrackingNumber;
        lab.ModifiedDate = DateTime.UtcNow;

        _uow.LabOrders.Update(lab);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("StatusUpdated", "LabOrder", id.ToString(), $"Lab order status → {req.Status}.");

        return Ok(new { lab.Status });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var lab = await _uow.LabOrders.GetByIdAsync(id);
        if (lab == null) return NotFound();
        if (lab.Status != LabOrderStatus.Ordered)
            return BadRequest(new { message = "Only Ordered lab orders can be deleted." });

        _uow.LabOrders.Remove(lab);
        await _uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var labs = await _uow.LabOrders.GetAll().ToListAsync();
        return Ok(new
        {
            total = labs.Count,
            ordered = labs.Count(l => l.Status == LabOrderStatus.Ordered),
            inProgress = labs.Count(l => l.Status == LabOrderStatus.InProgress),
            ready = labs.Count(l => l.Status == LabOrderStatus.Ready),
            overdue = labs.Count(l => l.DueDate.HasValue && l.DueDate < DateTime.UtcNow
                                    && l.Status != LabOrderStatus.Received && l.Status != LabOrderStatus.Cancelled)
        });
    }
}

public record CreateLabOrderRequest(
    int PatientId, int? TreatmentId, int OrderedByDentistId, int? BranchId,
    string LabName, string WorkType, string? ToothNumbers, string? Shade,
    string? Instructions, DateTime? DueDate, decimal? EstimatedCost, string? Notes);

public record UpdateLabOrderRequest(
    string LabName, string WorkType, string? ToothNumbers, string? Shade,
    string? Instructions, DateTime? DueDate, decimal? EstimatedCost, string? TrackingNumber, string? Notes);

public record UpdateLabStatusRequest(LabOrderStatus Status, decimal? ActualCost, string? TrackingNumber);

