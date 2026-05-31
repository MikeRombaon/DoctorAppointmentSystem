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
[Authorize(Roles = "SuperAdmin,Admin,SupportStaff")]
public class PurchaseOrdersController : BaseController
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly TenantContext _tenantContext;

    public PurchaseOrdersController(IUnitOfWork uow, IAuditService audit, TenantContext tenantContext)
    {
        _uow = uow;
        _audit = audit;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null, [FromQuery] int? supplierId = null)
    {
        var query = _uow.PurchaseOrders.GetAll()
            .Include(po => po.Supplier)
            .Include(po => po.Branch)
            .Include(po => po.CreatedBy)
            .Include(po => po.Items)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PurchaseOrderStatus>(status, true, out var s))
            query = query.Where(po => po.Status == s);
        if (supplierId.HasValue)
            query = query.Where(po => po.SupplierId == supplierId);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(po => po.OrderDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(po => new
            {
                po.Id, po.PONumber, po.Status,
                po.SupplierId, SupplierName = po.Supplier.Name,
                po.BranchId, BranchName = po.Branch != null ? po.Branch.Name : null,
                CreatedBy = po.CreatedBy.FullName,
                po.OrderDate, po.ExpectedDeliveryDate, po.ReceivedDate,
                po.TotalAmount, po.Notes, po.InvoiceReference,
                ItemCount = po.Items.Count
            })
            .ToListAsync();

        return Ok(new { totalCount = total, items });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var po = await _uow.PurchaseOrders.GetAll()
            .Include(p => p.Supplier)
            .Include(p => p.Branch)
            .Include(p => p.CreatedBy)
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null) return NotFound();

        return Ok(new
        {
            po.Id, po.PONumber, po.Status,
            po.SupplierId, SupplierName = po.Supplier.Name,
            po.BranchId, BranchName = po.Branch?.Name,
            CreatedBy = po.CreatedBy.FullName,
            po.OrderDate, po.ExpectedDeliveryDate, po.ReceivedDate,
            po.TotalAmount, po.Notes, po.InvoiceReference,
            Items = po.Items.Select(i => new
            {
                i.Id, i.InventoryItemId,
                ItemName = i.InventoryItem.Name,
                ItemSKU = i.InventoryItem.SKU,
                i.QuantityOrdered, i.QuantityReceived, i.UnitCost,
                TotalCost = i.QuantityOrdered * i.UnitCost,
                i.Notes
            })
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderRequest req)
    {
        var userId = GetCurrentUserId();
        var poNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var po = new PurchaseOrder
        {
            PONumber = poNumber,
            SupplierId = req.SupplierId,
            BranchId = req.BranchId,
            CreatedByUserId = userId ?? 0,
            Status = PurchaseOrderStatus.Draft,
            OrderDate = DateTime.UtcNow,
            ExpectedDeliveryDate = req.ExpectedDeliveryDate,
            Notes = req.Notes,
            TotalAmount = req.Items.Sum(i => i.Quantity * i.UnitCost),
            TenantId = _tenantContext.TenantId ?? 0
        };

        po.Items = req.Items.Select(i => new PurchaseOrderItem
        {
            InventoryItemId = i.InventoryItemId,
            QuantityOrdered = i.Quantity,
            QuantityReceived = 0,
            UnitCost = i.UnitCost,
            Notes = i.Notes
        }).ToList();

        await _uow.PurchaseOrders.AddAsync(po);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Created", "PurchaseOrder", po.Id.ToString(), $"PO '{poNumber}' created for supplier {req.SupplierId}.");

        return CreatedAtAction(nameof(GetById), new { id = po.Id }, new { po.Id, po.PONumber });
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePOStatusRequest req)
    {
        var po = await _uow.PurchaseOrders.GetByIdAsync(id);
        if (po == null) return NotFound();

        po.Status = req.Status;
        po.ModifiedDate = DateTime.UtcNow;
        _uow.PurchaseOrders.Update(po);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("StatusUpdated", "PurchaseOrder", id.ToString(), $"PO '{po.PONumber}' status → {req.Status}.");

        return Ok(new { po.Status });
    }

    [HttpPost("{id}/receive")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Receive(int id, [FromBody] ReceivePORequest req)
    {
        var po = await _uow.PurchaseOrders.GetAll()
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (po == null) return NotFound();

        foreach (var received in req.Items)
        {
            var item = po.Items.FirstOrDefault(i => i.Id == received.ItemId);
            if (item == null) continue;

            item.QuantityReceived += received.QuantityReceived;

            // Update inventory
            item.InventoryItem.QuantityOnHand += received.QuantityReceived;
            item.InventoryItem.UnitCost = received.UnitCost ?? item.UnitCost;
            item.InventoryItem.LastRestockDate = DateTime.UtcNow;

            // Record transaction
            var txn = new InventoryTransaction
            {
                InventoryItemId = item.InventoryItemId,
                TransactionType = InventoryTransactionType.Purchase,
                Quantity = received.QuantityReceived,
                UnitCost = item.UnitCost,
                TotalCost = item.UnitCost * received.QuantityReceived,
                Notes = $"Received via PO #{po.PONumber}",
                TransactionDate = DateTime.UtcNow,
                UserId = GetCurrentUserId()
            };
            await _uow.InventoryTransactions.AddAsync(txn);
        }

        var allReceived = po.Items.All(i => i.QuantityReceived >= i.QuantityOrdered);
        var anyReceived = po.Items.Any(i => i.QuantityReceived > 0);
        po.Status = allReceived ? PurchaseOrderStatus.Received
            : anyReceived ? PurchaseOrderStatus.PartiallyReceived
            : po.Status;
        po.ReceivedDate = allReceived ? DateTime.UtcNow : po.ReceivedDate;
        po.ModifiedDate = DateTime.UtcNow;

        _uow.PurchaseOrders.Update(po);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Received", "PurchaseOrder", id.ToString(), $"PO '{po.PONumber}' items received. Status → {po.Status}.");

        return Ok(new { po.Status });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var po = await _uow.PurchaseOrders.GetByIdAsync(id);
        if (po == null) return NotFound();
        if (po.Status != PurchaseOrderStatus.Draft)
            return BadRequest(new { message = "Only Draft purchase orders can be deleted." });

        _uow.PurchaseOrders.Remove(po);
        await _uow.SaveChangesAsync();
        await _audit.LogAsync("Deleted", "PurchaseOrder", id.ToString(), $"PO '{po.PONumber}' deleted.");
        return NoContent();
    }
}

public record CreatePurchaseOrderRequest(
    int SupplierId, int? BranchId, DateTime? ExpectedDeliveryDate,
    string? Notes, List<POItemRequest> Items);

public record POItemRequest(int InventoryItemId, int Quantity, decimal UnitCost, string? Notes);

public record UpdatePOStatusRequest(PurchaseOrderStatus Status);

public record ReceivePORequest(List<ReceivedItem> Items);

public record ReceivedItem(int ItemId, int QuantityReceived, decimal? UnitCost);

