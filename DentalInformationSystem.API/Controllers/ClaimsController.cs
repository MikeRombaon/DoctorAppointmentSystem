using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Domain.Enums;
using DentalInformationSystem.Repositories.Interfaces;

namespace DentalInformationSystem.API.Controllers;

[Authorize]
public class ClaimsController : BaseController
{
    private readonly IUnitOfWork _uow;

    public ClaimsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var claims = await _uow.InsuranceClaims.GetAll()
            .Include(c => c.InsurancePayer)
            .Include(c => c.Invoice)
            .Where(c => c.PatientId == patientId)
            .OrderByDescending(c => c.CreatedDate)
            .Select(c => new
            {
                c.Id,
                c.ClaimNumber,
                c.PatientId,
                c.InvoiceId,
                InvoiceNumber = c.Invoice.InvoiceNumber,
                c.InsurancePayerId,
                PayerName = c.InsurancePayer.Name,
                c.ServiceDateFrom,
                c.ServiceDateTo,
                c.BilledAmount,
                c.AllowedAmount,
                c.PaidAmount,
                c.AdjustmentAmount,
                c.PatientResponsibility,
                c.Status,
                StatusName = c.Status.ToString(),
                c.SubmittedDate,
                c.AdjudicatedDate,
                c.PaidDate,
                c.DenialReason,
                c.Notes,
                c.CreatedDate
            })
            .ToListAsync();

        return Ok(claims);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var claim = await _uow.InsuranceClaims.GetAll()
            .Include(c => c.InsurancePayer)
            .Include(c => c.Invoice).ThenInclude(inv => inv.InvoiceItems)
            .Include(c => c.Patient)
            .Include(c => c.PatientInsurance)
            .Where(c => c.Id == id)
            .FirstOrDefaultAsync();

        if (claim == null) return NotFound();

        return Ok(new
        {
            claim.Id,
            claim.ClaimNumber,
            claim.PatientId,
            PatientName = claim.Patient.FullName,
            claim.InvoiceId,
            InvoiceNumber = claim.Invoice.InvoiceNumber,
            claim.InsurancePayerId,
            PayerName = claim.InsurancePayer.Name,
            claim.PatientInsuranceId,
            claim.ServiceDateFrom,
            claim.ServiceDateTo,
            claim.BilledAmount,
            claim.AllowedAmount,
            claim.PaidAmount,
            claim.AdjustmentAmount,
            claim.PatientResponsibility,
            claim.Status,
            StatusName = claim.Status.ToString(),
            claim.SubmittedDate,
            claim.AdjudicatedDate,
            claim.PaidDate,
            claim.EobNotes,
            claim.DenialReason,
            claim.Notes,
            claim.CreatedDate
        });
    }

    [HttpPost]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> Create([FromBody] CreateClaimRequest req)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var invoice = await _uow.Invoices.GetAll()
            .Include(i => i.InvoiceItems)
            .FirstOrDefaultAsync(i => i.Id == req.InvoiceId);

        if (invoice == null) return BadRequest("Invoice not found.");

        var claimNumber = $"CLM-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var claim = new InsuranceClaim
        {
            PatientId = req.PatientId,
            InvoiceId = req.InvoiceId,
            InsurancePayerId = req.InsurancePayerId,
            PatientInsuranceId = req.PatientInsuranceId,
            CreatedByUserId = userId.Value,
            ClaimNumber = claimNumber,
            ServiceDateFrom = req.ServiceDateFrom,
            ServiceDateTo = req.ServiceDateTo,
            BilledAmount = req.BilledAmount > 0 ? req.BilledAmount : invoice.TotalAmount,
            AllowedAmount = 0,
            PaidAmount = 0,
            AdjustmentAmount = 0,
            PatientResponsibility = 0,
            Status = ClaimStatus.Draft,
            Notes = req.Notes
        };

        await _uow.InsuranceClaims.AddAsync(claim);
        await _uow.SaveChangesAsync();

        return Ok(new { claim.Id, claim.ClaimNumber });
    }

    [HttpPatch("{id}/submit")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> Submit(int id)
    {
        var claim = await _uow.InsuranceClaims.GetByIdAsync(id);
        if (claim == null) return NotFound();
        if (claim.Status != ClaimStatus.Draft) return BadRequest("Only draft claims can be submitted.");

        claim.Status = ClaimStatus.Submitted;
        claim.SubmittedDate = DateTime.UtcNow;
        _uow.InsuranceClaims.Update(claim);
        await _uow.SaveChangesAsync();
        return Ok(new { claim.Id, claim.Status });
    }

    [HttpPatch("{id}/adjudicate")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> Adjudicate(int id, [FromBody] AdjudicateClaimRequest req)
    {
        var claim = await _uow.InsuranceClaims.GetByIdAsync(id);
        if (claim == null) return NotFound();

        claim.AllowedAmount = req.AllowedAmount;
        claim.PaidAmount = req.PaidAmount;
        claim.AdjustmentAmount = req.AdjustmentAmount;
        claim.PatientResponsibility = req.PatientResponsibility;
        claim.EobNotes = req.EobNotes;
        claim.AdjudicatedDate = DateTime.UtcNow;

        claim.Status = req.PaidAmount > 0 ? ClaimStatus.Approved : ClaimStatus.Denied;
        if (req.DenialReason != null) claim.DenialReason = req.DenialReason;

        _uow.InsuranceClaims.Update(claim);
        await _uow.SaveChangesAsync();
        return Ok(new { claim.Id, claim.Status });
    }

    [HttpPatch("{id}/paid")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> MarkPaid(int id, [FromBody] MarkPaidRequest req)
    {
        var claim = await _uow.InsuranceClaims.GetByIdAsync(id);
        if (claim == null) return NotFound();
        if (claim.Status != ClaimStatus.Approved) return BadRequest("Only approved claims can be marked paid.");

        claim.PaidAmount = req.PaidAmount;
        claim.PaidDate = DateTime.UtcNow;
        claim.Status = ClaimStatus.Paid;
        _uow.InsuranceClaims.Update(claim);
        await _uow.SaveChangesAsync();
        return Ok(new { claim.Id, claim.Status });
    }

    [HttpPatch("{id}/void")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> Void(int id)
    {
        var claim = await _uow.InsuranceClaims.GetByIdAsync(id);
        if (claim == null) return NotFound();

        claim.Status = ClaimStatus.Voided;
        _uow.InsuranceClaims.Update(claim);
        await _uow.SaveChangesAsync();
        return Ok(new { claim.Id, claim.Status });
    }
}

// ── Request Models ─────────────────────────────────────────────────────────

public record CreateClaimRequest(
    int PatientId,
    int InvoiceId,
    int InsurancePayerId,
    int? PatientInsuranceId,
    DateTime ServiceDateFrom,
    DateTime ServiceDateTo,
    decimal BilledAmount,
    string? Notes
);

public record AdjudicateClaimRequest(
    decimal AllowedAmount,
    decimal PaidAmount,
    decimal AdjustmentAmount,
    decimal PatientResponsibility,
    string? EobNotes,
    string? DenialReason
);

public record MarkPaidRequest(decimal PaidAmount);
