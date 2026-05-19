using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Extensions;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanManageInventory)] // Admin, InventoryManager, Dentist, DentalHygienist
public class InventoryController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public InventoryController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("items")]
    public async Task<IActionResult> GetAllItems(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] bool? lowStock = null)
    {
        var query = _unitOfWork.InventoryItems.GetAll();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(i =>
                i.Name.Contains(search) ||
                i.SKU.Contains(search) ||
                (i.Manufacturer != null && i.Manufacturer.Contains(search)));
        }

        if (lowStock == true)
        {
            query = query.Where(i => i.QuantityOnHand <= i.MinimumQuantity);
        }

        query = query.OrderBy(i => i.Name);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }

    [HttpGet("items/{id}")]
    public async Task<IActionResult> GetItemById(int id)
    {
        var item = await _unitOfWork.InventoryItems
            .Find(i => i.Id == id)
            .Include(i => i.Transactions)
            .FirstOrDefaultAsync();

        if (item == null)
            return NotFound(new { message = "Item not found" });

        return Ok(item);
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem([FromBody] InventoryItem item)
    {
        if (await _unitOfWork.InventoryItems.AnyAsync(i => i.SKU == item.SKU))
            return BadRequest(new { message = "SKU already exists" });

        item.CreatedDate = DateTime.UtcNow;
        await _unitOfWork.InventoryItems.AddAsync(item);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetItemById), new { id = item.Id }, item);
    }

    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] InventoryItem item)
    {
        var existing = await _unitOfWork.InventoryItems.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Item not found" });

        if (await _unitOfWork.InventoryItems.AnyAsync(i => i.SKU == item.SKU && i.Id != id))
            return BadRequest(new { message = "SKU already exists" });

        existing.Name = item.Name;
        existing.Description = item.Description;
        existing.SKU = item.SKU;
        existing.Category = item.Category;
        existing.Manufacturer = item.Manufacturer;
        existing.MinimumQuantity = item.MinimumQuantity;
        existing.ReorderQuantity = item.ReorderQuantity;
        existing.Unit = item.Unit;
        existing.UnitCost = item.UnitCost;
        existing.SellingPrice = item.SellingPrice;
        existing.ExpirationDate = item.ExpirationDate;
        existing.Location = item.Location;
        existing.IsActive = item.IsActive;

        _unitOfWork.InventoryItems.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpPost("transactions")]
    public async Task<IActionResult> CreateTransaction([FromBody] InventoryTransaction transaction)
    {
        var item = await _unitOfWork.InventoryItems.GetByIdAsync(transaction.InventoryItemId);
        if (item == null)
            return BadRequest(new { message = "Invalid inventory item ID" });

        transaction.TransactionDate = DateTime.UtcNow;
        transaction.TotalCost = transaction.Quantity * transaction.UnitCost;

        // Update inventory quantity based on transaction type
        switch (transaction.TransactionType)
        {
            case Domain.Enums.InventoryTransactionType.Purchase:
                item.QuantityOnHand += transaction.Quantity;
                item.LastRestockDate = DateTime.UtcNow;
                break;
            case Domain.Enums.InventoryTransactionType.Usage:
            case Domain.Enums.InventoryTransactionType.Disposal:
                item.QuantityOnHand -= transaction.Quantity;
                break;
            case Domain.Enums.InventoryTransactionType.Adjustment:
                item.QuantityOnHand = transaction.Quantity;
                break;
            case Domain.Enums.InventoryTransactionType.Return:
                item.QuantityOnHand += transaction.Quantity;
                break;
        }

        await _unitOfWork.InventoryTransactions.AddAsync(transaction);
        _unitOfWork.InventoryItems.Update(item);
        await _unitOfWork.SaveChangesAsync();

        return Ok(transaction);
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockItems()
    {
        var items = await _unitOfWork.InventoryItems
            .Find(i => i.QuantityOnHand <= i.MinimumQuantity && i.IsActive)
            .OrderBy(i => i.QuantityOnHand)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("items/{id}/issue")]
    public async Task<IActionResult> IssueStock(int id, [FromBody] IssueStockRequest request)
    {
        var item = await _unitOfWork.InventoryItems.GetByIdAsync(id);
        if (item == null)
            return NotFound(new { message = "Item not found" });

        // Validate sufficient stock
        if (item.QuantityOnHand < request.Quantity)
            return BadRequest(new { message = $"Insufficient stock. Available: {item.QuantityOnHand}" });

        // Create usage transaction
        var transaction = new InventoryTransaction
        {
            InventoryItemId = id,
            TransactionType = Domain.Enums.InventoryTransactionType.Usage,
            Quantity = request.Quantity,
            UnitCost = item.UnitCost,
            TotalCost = request.Quantity * item.UnitCost,
            TransactionDate = DateTime.UtcNow,
            UserId = GetCurrentUserId(),
            Reason = request.Reason,
            Notes = request.Notes
        };

        // Update inventory quantity
        item.QuantityOnHand -= request.Quantity;

        await _unitOfWork.InventoryTransactions.AddAsync(transaction);
        _unitOfWork.InventoryItems.Update(item);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new
        {
            message = "Stock issued successfully",
            transaction,
            remainingStock = item.QuantityOnHand,
            isLowStock = item.QuantityOnHand <= item.MinimumQuantity
        });
    }

    [HttpPost("items/{id}/receive")]
    public async Task<IActionResult> ReceiveStock(int id, [FromBody] ReceiveStockRequest request)
    {
        var item = await _unitOfWork.InventoryItems.GetByIdAsync(id);
        if (item == null)
            return NotFound(new { message = "Item not found" });

        // Validate quantity
        if (request.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than 0" });

        // Use provided unit cost or default to item's unit cost
        var unitCost = request.UnitCost ?? item.UnitCost;

        // Create purchase transaction
        var transaction = new InventoryTransaction
        {
            InventoryItemId = id,
            TransactionType = Domain.Enums.InventoryTransactionType.Purchase,
            Quantity = request.Quantity,
            UnitCost = unitCost,
            TotalCost = request.Quantity * unitCost,
            TransactionDate = DateTime.UtcNow,
            UserId = GetCurrentUserId(),
            SupplierName = request.SupplierName,
            InvoiceNumber = request.InvoiceNumber,
            Notes = request.Notes
        };

        // Update inventory quantity
        item.QuantityOnHand += request.Quantity;
        item.LastRestockDate = DateTime.UtcNow;

        // Update unit cost if provided and different
        if (request.UnitCost.HasValue && request.UnitCost.Value != item.UnitCost)
        {
            item.UnitCost = request.UnitCost.Value;
        }

        await _unitOfWork.InventoryTransactions.AddAsync(transaction);
        _unitOfWork.InventoryItems.Update(item);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new
        {
            message = "Stock received successfully",
            transaction,
            newStock = item.QuantityOnHand,
            isLowStock = item.QuantityOnHand <= item.MinimumQuantity,
            wasLowStock = (item.QuantityOnHand - request.Quantity) <= item.MinimumQuantity
        });
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] int? itemId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        IQueryable<InventoryTransaction> query = _unitOfWork.InventoryTransactions.GetAll()
            .Include(t => t.InventoryItem)
            .Include(t => t.User);

        if (itemId.HasValue)
        {
            query = query.Where(t => t.InventoryItemId == itemId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate <= toDate.Value);
        }

        query = query.OrderByDescending(t => t.TransactionDate);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize
        });
    }
}

public class IssueStockRequest
{
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}

public class ReceiveStockRequest
{
    public int Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public string? SupplierName { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
}
