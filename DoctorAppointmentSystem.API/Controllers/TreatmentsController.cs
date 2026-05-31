using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Extensions;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)] // Admin, Doctor, ClinicalStaff
public class TreatmentsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public TreatmentsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? appointmentId = null,
        [FromQuery] int? patientId = null,
        [FromQuery] TreatmentStatus? status = null)
    {
        IQueryable<Treatment> query = _unitOfWork.Treatments.GetAll()
            .Include(t => t.Appointment)
                .ThenInclude(a => a.Patient)
            .Include(t => t.Dentist)
            .Include(t => t.Procedure)
            .Include(t => t.TreatmentProcedures)
                .ThenInclude(tp => tp.Procedure);

        if (appointmentId.HasValue)
        {
            query = query.Where(t => t.AppointmentId == appointmentId.Value);
        }

        if (patientId.HasValue)
        {
            query = query.Where(t => t.Appointment.PatientId == patientId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        query = query.OrderByDescending(t => t.TreatmentDate);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var treatment = await _unitOfWork.Treatments
            .Find(t => t.Id == id)
            .Include(t => t.Appointment)
                .ThenInclude(a => a.Patient)
            .Include(t => t.Dentist)
            .Include(t => t.Procedure)
            .Include(t => t.TreatmentProcedures)
                .ThenInclude(tp => tp.Procedure)
            .Include(t => t.InventoryUsages)
                .ThenInclude(iu => iu.InventoryItem)
            .FirstOrDefaultAsync();

        if (treatment == null)
            return NotFound(new { message = "Treatment not found" });

        return Ok(treatment);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTreatmentDto dto)
    {
        // Validate appointment exists
        if (!await _unitOfWork.Appointments.AnyAsync(a => a.Id == dto.AppointmentId))
            return BadRequest(new { message = "Invalid appointment ID" });

        if (dto.ProcedureIds == null || dto.ProcedureIds.Count == 0)
            return BadRequest(new { message = "At least one procedure is required" });

        // Validate all procedures exist
        foreach (var procId in dto.ProcedureIds)
        {
            if (!await _unitOfWork.Procedures.AnyAsync(p => p.Id == procId))
                return BadRequest(new { message = $"Invalid procedure ID: {procId}" });
        }

        var treatment = new Treatment
        {
            AppointmentId = dto.AppointmentId,
            DentistId = dto.DentistId,
            ProcedureId = dto.ProcedureIds.First(), // primary procedure for backward compat
            ToothPosition = dto.ToothPosition,
            ToothSurface = dto.ToothSurface,
            Diagnosis = dto.Diagnosis,
            Notes = dto.Notes,
            Cost = 0,
            CreatedDate = DateTime.UtcNow,
            TreatmentDate = DateTime.UtcNow,
            Status = TreatmentStatus.Planned,
            TenantId = _tenantContext.TenantId ?? 0,
        };

        await _unitOfWork.Treatments.AddAsync(treatment);
        await _unitOfWork.SaveChangesAsync();

        // Add TreatmentProcedure rows
        foreach (var procId in dto.ProcedureIds)
        {
            await _unitOfWork.TreatmentProcedures.AddAsync(new TreatmentProcedure
            {
                TreatmentId = treatment.Id,
                ProcedureId = procId
            });
        }
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = treatment.Id }, treatment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Treatment treatment)
    {
        var existing = await _unitOfWork.Treatments.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Treatment not found" });

        existing.ProcedureId = treatment.ProcedureId ?? existing.ProcedureId;
        existing.ToothPosition = treatment.ToothPosition;
        existing.ToothSurface = treatment.ToothSurface;
        existing.Status = treatment.Status;
        existing.Cost = treatment.Cost;
        existing.Notes = treatment.Notes;
        existing.Diagnosis = treatment.Diagnosis;

        _unitOfWork.Treatments.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpPatch("{id}/complete")]
    public async Task<IActionResult> CompleteTreatment(int id)
    {
        var treatment = await _unitOfWork.Treatments
            .Find(t => t.Id == id)
            .Include(t => t.Appointment)
            .FirstOrDefaultAsync();

        if (treatment == null)
            return NotFound(new { message = "Treatment not found" });

        treatment.Status = TreatmentStatus.Completed;
        treatment.TreatmentDate = DateTime.UtcNow;

        // Update appointment status if all treatments are completed
        var allTreatments = await _unitOfWork.Treatments
            .Find(t => t.AppointmentId == treatment.AppointmentId)
            .ToListAsync();

        if (allTreatments.All(t => t.Status == TreatmentStatus.Completed || t.Id == id))
        {
            treatment.Appointment.Status = AppointmentStatus.Completed;
            _unitOfWork.Appointments.Update(treatment.Appointment);
        }

        _unitOfWork.Treatments.Update(treatment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Treatment completed successfully", treatment });
    }

    [HttpPost("{id}/inventory-usage")]
    public async Task<IActionResult> AddInventoryUsage(int id, [FromBody] List<TreatmentInventoryUsageDto> usages)
    {
        var treatment = await _unitOfWork.Treatments.GetByIdAsync(id);
        if (treatment == null)
            return NotFound(new { message = "Treatment not found" });

        foreach (var usage in usages)
        {
            // Validate inventory item exists
            var item = await _unitOfWork.InventoryItems.GetByIdAsync(usage.InventoryItemId);
            if (item == null)
                return BadRequest(new { message = $"Invalid inventory item ID: {usage.InventoryItemId}" });

            // Check stock availability
            if (item.QuantityOnHand < usage.QuantityUsed)
                return BadRequest(new { message = $"Insufficient stock for {item.Name}. Available: {item.QuantityOnHand}, Required: {usage.QuantityUsed}" });

            // Create inventory usage record
            var inventoryUsage = new TreatmentInventoryUsage
            {
                TreatmentId = id,
                InventoryItemId = usage.InventoryItemId,
                QuantityUsed = usage.QuantityUsed,
                UnitCost = item.UnitCost,
                TotalCost = item.UnitCost * usage.QuantityUsed,
                UsageDate = DateTime.UtcNow
            };

            await _unitOfWork.TreatmentInventoryUsages.AddAsync(inventoryUsage);

            // Deduct inventory
            item.QuantityOnHand -= usage.QuantityUsed;
            _unitOfWork.InventoryItems.Update(item);

            // Create inventory transaction for tracking
            var transaction = new InventoryTransaction
            {
                InventoryItemId = usage.InventoryItemId,
                TransactionType = InventoryTransactionType.Usage,
                Quantity = usage.QuantityUsed,
                UnitCost = item.UnitCost,
                TotalCost = item.UnitCost * usage.QuantityUsed,
                TransactionDate = DateTime.UtcNow,
                Notes = $"Used in treatment ID: {id}"
            };

            await _unitOfWork.InventoryTransactions.AddAsync(transaction);
        }

        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Inventory usage recorded and stock updated" });
    }

    [HttpGet("{id}/inventory-usage")]
    public async Task<IActionResult> GetInventoryUsage(int id)
    {
        var usages = await _unitOfWork.TreatmentInventoryUsages
            .Find(u => u.TreatmentId == id)
            .Include(u => u.InventoryItem)
            .ToListAsync();

        return Ok(usages);
    }

    [HttpGet("patient/{patientId}/history")]
    public async Task<IActionResult> GetPatientTreatmentHistory(int patientId)
    {
        var treatments = await _unitOfWork.Treatments.GetAll()
            .Where(t => t.Appointment.PatientId == patientId)
            .Include(t => t.Procedure)
            .Include(t => t.Dentist)
            .Include(t => t.Appointment)
            .OrderByDescending(t => t.TreatmentDate)
            .ToListAsync();

        return Ok(treatments);
    }
}

public class TreatmentInventoryUsageDto
{
    public int InventoryItemId { get; set; }
    public int QuantityUsed { get; set; }
}

public class CreateTreatmentDto
{
    public int AppointmentId { get; set; }
    public int DentistId { get; set; }
    public List<int> ProcedureIds { get; set; } = new();
    public DoctorAppointmentSystem.Domain.Enums.ToothPosition? ToothPosition { get; set; }
    public string? ToothSurface { get; set; }
    public string? Diagnosis { get; set; }
    public string? Notes { get; set; }
}
