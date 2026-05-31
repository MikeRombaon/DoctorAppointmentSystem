using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;

namespace DoctorAppointmentSystem.API.Controllers;

[Authorize]
public class StatementsController : BaseController
{
    private readonly IUnitOfWork _uow;

    public StatementsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    /// <summary>Patient statement — all invoices with payments and adjustments.</summary>
    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetPatientStatement(int patientId)
    {
        var patient = await _uow.Patients.GetByIdAsync(patientId);
        if (patient == null) return NotFound();

        var invoices = await _uow.Invoices.GetAll()
            .Include(i => i.InvoiceItems)
            .Include(i => i.Payments)
            .Include(i => i.Adjustments)
            .Include(i => i.Claims)
            .Where(i => i.PatientId == patientId)
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync();

        var statement = invoices.Select(inv => new
        {
            inv.Id,
            inv.InvoiceNumber,
            inv.InvoiceDate,
            inv.DueDate,
            inv.SubTotal,
            inv.TaxAmount,
            inv.Discount,
            inv.TotalAmount,
            inv.Status,
            StatusName = inv.Status.ToString(),
            Payments = inv.Payments.Select(p => new
            {
                p.Id,
                p.TransactionNumber,
                p.Amount,
                p.PaymentDate,
                PaymentMethod = p.PaymentMethod.ToString()
            }),
            Adjustments = inv.Adjustments.Select(a => new
            {
                a.Id,
                a.AdjustmentType,
                AdjustmentTypeName = a.AdjustmentType.ToString(),
                a.Amount,
                a.Reason,
                a.AdjustmentDate
            }),
            TotalPaid = inv.Payments.Sum(p => p.Amount),
            TotalAdjusted = inv.Adjustments.Sum(a => a.Amount),
            Balance = inv.TotalAmount - inv.Payments.Sum(p => p.Amount) - inv.Adjustments.Sum(a => a.Amount)
        });

        return Ok(new
        {
            PatientId = patientId,
            PatientName = patient.FullName,
            GeneratedAt = DateTime.UtcNow,
            Invoices = statement,
            TotalBilled = invoices.Sum(i => i.TotalAmount),
            TotalPaid = invoices.Sum(i => i.Payments.Sum(p => p.Amount)),
            TotalAdjusted = invoices.Sum(i => i.Adjustments.Sum(a => a.Amount)),
            OutstandingBalance = invoices.Sum(i =>
                i.TotalAmount - i.Payments.Sum(p => p.Amount) - i.Adjustments.Sum(a => a.Amount))
        });
    }

    /// <summary>AR Aging report — buckets invoices by age of outstanding balance.</summary>
    [HttpGet("aging")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> GetArAging()
    {
        var today = DateTime.UtcNow.Date;

        var invoices = await _uow.Invoices.GetAll()
            .Include(i => i.Patient)
            .Include(i => i.Payments)
            .Include(i => i.Adjustments)
            .Where(i => i.Status != PaymentStatus.Paid && i.Status != PaymentStatus.Cancelled)
            .ToListAsync();

        var rows = invoices.Select(inv =>
        {
            var balance = inv.TotalAmount
                - inv.Payments.Sum(p => p.Amount)
                - inv.Adjustments.Sum(a => a.Amount);

            if (balance <= 0) return null;

            var age = (today - inv.InvoiceDate.Date).Days;

            return new
            {
                inv.Id,
                inv.InvoiceNumber,
                inv.PatientId,
                PatientName = inv.Patient.FullName,
                inv.InvoiceDate,
                inv.DueDate,
                inv.TotalAmount,
                Balance = balance,
                Age = age,
                Bucket = age switch
                {
                    <= 30 => "0-30",
                    <= 60 => "31-60",
                    <= 90 => "61-90",
                    <= 120 => "91-120",
                    _ => "120+"
                }
            };
        })
        .Where(r => r != null)
        .OrderByDescending(r => r!.Age)
        .ToList();

        var summary = new
        {
            Total = rows.Sum(r => r!.Balance),
            Bucket0_30 = rows.Where(r => r!.Bucket == "0-30").Sum(r => r!.Balance),
            Bucket31_60 = rows.Where(r => r!.Bucket == "31-60").Sum(r => r!.Balance),
            Bucket61_90 = rows.Where(r => r!.Bucket == "61-90").Sum(r => r!.Balance),
            Bucket91_120 = rows.Where(r => r!.Bucket == "91-120").Sum(r => r!.Balance),
            Bucket120Plus = rows.Where(r => r!.Bucket == "120+").Sum(r => r!.Balance),
        };

        return Ok(new { Summary = summary, Rows = rows, GeneratedAt = DateTime.UtcNow });
    }

    /// <summary>Add an adjustment (discount / write-off / correction) to an invoice.</summary>
    [HttpPost("adjustments")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> AddAdjustment([FromBody] AddAdjustmentRequest req)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var invoice = await _uow.Invoices.GetByIdAsync(req.InvoiceId);
        if (invoice == null) return NotFound("Invoice not found.");

        var adjustment = new InvoiceAdjustment
        {
            InvoiceId = req.InvoiceId,
            CreatedByUserId = userId.Value,
            AdjustmentType = req.AdjustmentType,
            Amount = req.Amount,
            Reason = req.Reason,
            Notes = req.Notes,
            AdjustmentDate = req.AdjustmentDate ?? DateTime.UtcNow
        };

        await _uow.InvoiceAdjustments.AddAsync(adjustment);

        // Recalculate invoice balance
        var allPayments = await _uow.Payments.GetAll()
            .Where(p => p.InvoiceId == req.InvoiceId)
            .SumAsync(p => p.Amount);

        var allAdjustments = await _uow.InvoiceAdjustments.GetAll()
            .Where(a => a.InvoiceId == req.InvoiceId)
            .SumAsync(a => a.Amount);

        var newBalance = invoice.TotalAmount - allPayments - allAdjustments - req.Amount;
        invoice.BalanceAmount = newBalance > 0 ? newBalance : 0;

        if (invoice.BalanceAmount == 0)
            invoice.Status = PaymentStatus.Paid;
        else if (allPayments + allAdjustments + req.Amount > 0)
            invoice.Status = PaymentStatus.PartiallyPaid;

        _uow.Invoices.Update(invoice);
        await _uow.SaveChangesAsync();

        return Ok(new { adjustment.Id, invoice.BalanceAmount, InvoiceStatus = invoice.Status.ToString() });
    }

    [HttpGet("adjustments/{invoiceId}")]
    public async Task<IActionResult> GetAdjustments(int invoiceId)
    {
        var adjustments = await _uow.InvoiceAdjustments.GetAll()
            .Include(a => a.CreatedByUser)
            .Where(a => a.InvoiceId == invoiceId)
            .OrderByDescending(a => a.AdjustmentDate)
            .Select(a => new
            {
                a.Id,
                a.InvoiceId,
                a.AdjustmentType,
                AdjustmentTypeName = a.AdjustmentType.ToString(),
                a.Amount,
                a.Reason,
                a.Notes,
                a.AdjustmentDate,
                CreatedBy = a.CreatedByUser.FullName
            })
            .ToListAsync();

        return Ok(adjustments);
    }
}

// ── Request Models ─────────────────────────────────────────────────────────

public record AddAdjustmentRequest(
    int InvoiceId,
    AdjustmentType AdjustmentType,
    decimal Amount,
    string Reason,
    string? Notes,
    DateTime? AdjustmentDate
);
