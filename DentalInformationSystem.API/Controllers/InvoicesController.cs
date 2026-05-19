using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Domain.Enums;
using DentalInformationSystem.Repositories.Extensions;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanProcessBilling)] // Admin, AccountingStaff, Receptionist
public class InvoicesController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public InvoicesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? patientId = null,
        [FromQuery] PaymentStatus? status = null)
    {
        IQueryable<Invoice> query = _unitOfWork.Invoices.GetAll()
            .Include(i => i.Patient)
            .Include(i => i.InvoiceItems)
            .Include(i => i.Payments);

        if (patientId.HasValue)
        {
            query = query.Where(i => i.PatientId == patientId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }

        query = query.OrderByDescending(i => i.InvoiceDate);

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
        var invoice = await _unitOfWork.Invoices
            .Find(i => i.Id == id)
            .Include(i => i.Patient)
            .Include(i => i.InvoiceItems)
            .ThenInclude(ii => ii.Treatment)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync();

        if (invoice == null)
            return NotFound(new { message = "Invoice not found" });

        return Ok(invoice);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Invoice invoice)
    {
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == invoice.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        // Generate invoice number
        var lastInvoice = await _unitOfWork.Invoices.GetAll()
            .OrderByDescending(i => i.Id)
            .FirstOrDefaultAsync();

        var invoiceNumber = $"INV-{DateTime.Now:yyyyMMdd}-{(lastInvoice?.Id ?? 0) + 1:D4}";

        invoice.InvoiceNumber = invoiceNumber;
        invoice.InvoiceDate = DateTime.UtcNow;
        invoice.CreatedDate = DateTime.UtcNow;
        invoice.PaidAmount = 0;
        invoice.BalanceAmount = invoice.TotalAmount;
        invoice.Status = PaymentStatus.Pending;

        await _unitOfWork.Invoices.AddAsync(invoice);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, invoice);
    }

    [HttpPost("{id}/payments")]
    public async Task<IActionResult> AddPayment(int id, [FromBody] Payment payment)
    {
        var invoice = await _unitOfWork.Invoices.GetByIdAsync(id);
        if (invoice == null)
            return NotFound(new { message = "Invoice not found" });

        if (payment.Amount <= 0)
            return BadRequest(new { message = "Payment amount must be greater than zero" });

        if (payment.Amount > invoice.BalanceAmount)
            return BadRequest(new { message = "Payment amount exceeds balance" });

        // Generate transaction number
        var transactionNumber = $"PAY-{DateTime.Now:yyyyMMddHHmmss}";

        payment.InvoiceId = id;
        payment.TransactionNumber = transactionNumber;
        payment.PaymentDate = DateTime.UtcNow;

        // Update invoice
        invoice.PaidAmount += payment.Amount;
        invoice.BalanceAmount -= payment.Amount;

        if (invoice.BalanceAmount == 0)
        {
            invoice.Status = PaymentStatus.Paid;
        }
        else if (invoice.PaidAmount > 0)
        {
            invoice.Status = PaymentStatus.PartiallyPaid;
        }

        await _unitOfWork.Payments.AddAsync(payment);
        _unitOfWork.Invoices.Update(invoice);
        await _unitOfWork.SaveChangesAsync();

        return Ok(payment);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var invoices = await _unitOfWork.Invoices
            .Find(i => i.Status == PaymentStatus.Pending || i.Status == PaymentStatus.PartiallyPaid)
            .Include(i => i.Patient)
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync();

        return Ok(invoices);
    }

    [HttpGet("overdue")]
    public async Task<IActionResult> GetOverdue()
    {
        var today = DateTime.UtcNow.Date;
        var invoices = await _unitOfWork.Invoices
            .Find(i => i.DueDate.HasValue && i.DueDate.Value < today && i.BalanceAmount > 0)
            .Include(i => i.Patient)
            .OrderBy(i => i.DueDate)
            .ToListAsync();

        return Ok(invoices);
    }
}
