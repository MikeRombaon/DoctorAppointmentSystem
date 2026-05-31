using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;

namespace DoctorAppointmentSystem.API.Controllers;

[Authorize]
public class EstimatesController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly TenantContext _tenantContext;

    public EstimatesController(IUnitOfWork uow, TenantContext tenantContext)
    {
        _uow = uow;
        _tenantContext = tenantContext;
    }

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var estimates = await _uow.TreatmentEstimates.GetAll()
            .Include(e => e.CreatedByUser)
            .Include(e => e.TreatmentPlan)
            .Where(e => e.PatientId == patientId)
            .OrderByDescending(e => e.EstimateDate)
            .Select(e => new
            {
                e.Id,
                e.EstimateNumber,
                e.EstimateDate,
                e.ExpirationDate,
                e.TotalFee,
                e.InsuranceEstimate,
                e.PatientPortion,
                e.Discount,
                e.Status,
                StatusName = e.Status.ToString(),
                CreatedBy = e.CreatedByUser.FullName,
                TreatmentPlanTitle = e.TreatmentPlan != null ? e.TreatmentPlan.Title : null,
                e.PresentedDate,
                e.AcceptedDate,
                e.Notes
            })
            .ToListAsync();

        return Ok(estimates);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var estimate = await _uow.TreatmentEstimates.GetAll()
            .Include(e => e.CreatedByUser)
            .Include(e => e.Patient)
            .Include(e => e.TreatmentPlan)
            .Include(e => e.Items).ThenInclude(i => i.Procedure)
            .Where(e => e.Id == id)
            .FirstOrDefaultAsync();

        if (estimate == null) return NotFound();

        return Ok(new
        {
            estimate.Id,
            estimate.EstimateNumber,
            estimate.PatientId,
            PatientName = estimate.Patient.FullName,
            estimate.EstimateDate,
            estimate.ExpirationDate,
            estimate.TotalFee,
            estimate.InsuranceEstimate,
            estimate.PatientPortion,
            estimate.Discount,
            estimate.Status,
            StatusName = estimate.Status.ToString(),
            CreatedBy = estimate.CreatedByUser.FullName,
            TreatmentPlanTitle = estimate.TreatmentPlan?.Title,
            estimate.PresentedDate,
            estimate.AcceptedDate,
            estimate.Notes,
            Items = estimate.Items.Select(i => new
            {
                i.Id,
                i.ProcedureId,
                ProcedureName = i.Procedure.Name,
                ProcedureCode = i.Procedure.Code,
                i.ToothNumber,
                i.Surface,
                i.Fee,
                i.InsuranceEstimate,
                i.PatientPortion,
                i.Notes
            })
        });
    }

    [HttpPost]
    [Authorize(Policy = "CanPerformTreatments")]
    public async Task<IActionResult> Create([FromBody] CreateEstimateRequest req)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var estimateNumber = $"EST-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var estimate = new TreatmentEstimate
        {
            PatientId = req.PatientId,
            TreatmentPlanId = req.TreatmentPlanId,
            CreatedByUserId = userId.Value,
            EstimateNumber = estimateNumber,
            EstimateDate = DateTime.UtcNow,
            ExpirationDate = req.ExpirationDate,
            Discount = req.Discount,
            Notes = req.Notes,
            Status = EstimateStatus.Draft,
            TenantId = _tenantContext.TenantId ?? 0
        };

        foreach (var item in req.Items)
        {
            estimate.Items.Add(new TreatmentEstimateItem
            {
                ProcedureId = item.ProcedureId,
                ToothNumber = item.ToothNumber,
                Surface = item.Surface,
                Fee = item.Fee,
                InsuranceEstimate = item.InsuranceEstimate,
                PatientPortion = item.Fee - item.InsuranceEstimate,
                Notes = item.Notes
            });
        }

        estimate.TotalFee = estimate.Items.Sum(i => i.Fee);
        estimate.InsuranceEstimate = estimate.Items.Sum(i => i.InsuranceEstimate);
        estimate.PatientPortion = estimate.TotalFee - estimate.InsuranceEstimate - req.Discount;

        await _uow.TreatmentEstimates.AddAsync(estimate);
        await _uow.SaveChangesAsync();

        return Ok(new { estimate.Id, estimate.EstimateNumber });
    }

    [HttpPatch("{id}/present")]
    [Authorize(Policy = "CanPerformTreatments")]
    public async Task<IActionResult> Present(int id)
    {
        var estimate = await _uow.TreatmentEstimates.GetByIdAsync(id);
        if (estimate == null) return NotFound();
        if (estimate.Status != EstimateStatus.Draft) return BadRequest("Only draft estimates can be presented.");

        estimate.Status = EstimateStatus.Presented;
        estimate.PresentedDate = DateTime.UtcNow;
        _uow.TreatmentEstimates.Update(estimate);
        await _uow.SaveChangesAsync();
        return Ok(new { estimate.Id, estimate.Status });
    }

    [HttpPatch("{id}/accept")]
    public async Task<IActionResult> Accept(int id)
    {
        var estimate = await _uow.TreatmentEstimates.GetByIdAsync(id);
        if (estimate == null) return NotFound();
        if (estimate.Status != EstimateStatus.Presented) return BadRequest("Only presented estimates can be accepted.");

        estimate.Status = EstimateStatus.Accepted;
        estimate.AcceptedDate = DateTime.UtcNow;
        _uow.TreatmentEstimates.Update(estimate);
        await _uow.SaveChangesAsync();
        return Ok(new { estimate.Id, estimate.Status });
    }

    [HttpPatch("{id}/decline")]
    public async Task<IActionResult> Decline(int id)
    {
        var estimate = await _uow.TreatmentEstimates.GetByIdAsync(id);
        if (estimate == null) return NotFound();

        estimate.Status = EstimateStatus.Declined;
        _uow.TreatmentEstimates.Update(estimate);
        await _uow.SaveChangesAsync();
        return Ok(new { estimate.Id, estimate.Status });
    }
}

// ── Request Models ─────────────────────────────────────────────────────────

public record CreateEstimateRequest(
    int PatientId,
    int? TreatmentPlanId,
    DateTime? ExpirationDate,
    decimal Discount,
    string? Notes,
    List<EstimateItemRequest> Items
);

public record EstimateItemRequest(
    int ProcedureId,
    string? ToothNumber,
    string? Surface,
    decimal Fee,
    decimal InsuranceEstimate,
    string? Notes
);
