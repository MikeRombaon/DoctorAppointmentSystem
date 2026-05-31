using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanViewReports)] // All staff
public class DashboardController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public DashboardController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var today = DateTime.UtcNow.Date;
        var thisMonth = new DateTime(today.Year, today.Month, 1);

        var overview = new
        {
            Patients = new
            {
                Total = await _unitOfWork.Patients.CountAsync(p => p.IsActive),
                NewThisMonth = await _unitOfWork.Patients.CountAsync(p =>
                    p.IsActive && p.CreatedDate >= thisMonth)
            },
            Appointments = new
            {
                Today = await _unitOfWork.Appointments.CountAsync(a =>
                    a.AppointmentDate.Date == today && a.Status != AppointmentStatus.Cancelled),
                ThisWeek = await _unitOfWork.Appointments.CountAsync(a =>
                    a.AppointmentDate >= today && a.AppointmentDate < today.AddDays(7) &&
                    a.Status != AppointmentStatus.Cancelled),
                Pending = await _unitOfWork.Appointments.CountAsync(a =>
                    a.Status == AppointmentStatus.Scheduled || a.Status == AppointmentStatus.Confirmed)
            },
            Treatments = new
            {
                InProgress = await _unitOfWork.Treatments.CountAsync(t =>
                    t.Status == TreatmentStatus.InProgress),
                Completed = await _unitOfWork.Treatments.CountAsync(t =>
                    t.Status == TreatmentStatus.Completed)
            },
            Inventory = new
            {
                TotalItems = await _unitOfWork.InventoryItems.CountAsync(i => i.IsActive),
                LowStock = await _unitOfWork.InventoryItems.CountAsync(i =>
                    i.IsActive && i.QuantityOnHand <= i.MinimumQuantity)
            },
            Billing = new
            {
                PendingInvoices = await _unitOfWork.Invoices.CountAsync(i =>
                    i.Status == PaymentStatus.Pending || i.Status == PaymentStatus.PartiallyPaid),
                OverdueInvoices = await _unitOfWork.Invoices.CountAsync(i =>
                    i.DueDate.HasValue && i.DueDate.Value < today && i.BalanceAmount > 0),
                TotalOutstanding = await _unitOfWork.Invoices.GetAll()
                    .Where(i => i.Status != PaymentStatus.Paid && i.Status != PaymentStatus.Cancelled)
                    .SumAsync(i => i.BalanceAmount)
            }
        };

        return Ok(overview);
    }

    [HttpGet("appointments/today")]
    public async Task<IActionResult> GetTodayAppointments()
    {
        var today = DateTime.UtcNow.Date;

        var appointments = await _unitOfWork.Appointments.GetAll()
            .Where(a => a.AppointmentDate.Date == today)
            .Include(a => a.Patient)
            .Include(a => a.Dentist)
            .OrderBy(a => a.StartTime)
            .Select(a => new
            {
                a.Id,
                a.AppointmentDate,
                a.StartTime,
                a.EndTime,
                Patient = new { a.Patient.Id, a.Patient.FullName, a.Patient.PhoneNumber },
                Dentist = new { a.Dentist.Id, a.Dentist.FullName },
                a.Purpose,
                Status = a.Status.ToString()
            })
            .ToListAsync();

        return Ok(appointments);
    }

    [HttpGet("revenue/monthly")]
    public async Task<IActionResult> GetMonthlyRevenue([FromQuery] int? year = null, [FromQuery] int? month = null)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var startDate = new DateTime(targetYear, targetMonth, 1);
        var endDate = startDate.AddMonths(1);

        var revenue = new
        {
            Month = startDate.ToString("MMMM yyyy"),
            TotalRevenue = await _unitOfWork.Invoices.GetAll()
                .Where(i => i.InvoiceDate >= startDate && i.InvoiceDate < endDate)
                .SumAsync(i => i.TotalAmount),
            CollectedRevenue = await _unitOfWork.Invoices.GetAll()
                .Where(i => i.InvoiceDate >= startDate && i.InvoiceDate < endDate)
                .SumAsync(i => i.PaidAmount),
            OutstandingRevenue = await _unitOfWork.Invoices.GetAll()
                .Where(i => i.InvoiceDate >= startDate && i.InvoiceDate < endDate)
                .SumAsync(i => i.BalanceAmount),
            TotalInvoices = await _unitOfWork.Invoices.CountAsync(i =>
                i.InvoiceDate >= startDate && i.InvoiceDate < endDate),
            PaidInvoices = await _unitOfWork.Invoices.CountAsync(i =>
                i.InvoiceDate >= startDate && i.InvoiceDate < endDate &&
                i.Status == PaymentStatus.Paid)
        };

        return Ok(revenue);
    }

    [HttpGet("revenue/yearly")]
    public async Task<IActionResult> GetYearlyRevenue([FromQuery] int? year = null)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var startDate = new DateTime(targetYear, 1, 1);
        var endDate = startDate.AddYears(1);

        var monthlyData = new List<object>();

        for (int month = 1; month <= 12; month++)
        {
            var monthStart = new DateTime(targetYear, month, 1);
            var monthEnd = monthStart.AddMonths(1);

            var monthRevenue = await _unitOfWork.Invoices.GetAll()
                .Where(i => i.InvoiceDate >= monthStart && i.InvoiceDate < monthEnd)
                .SumAsync(i => i.PaidAmount);

            monthlyData.Add(new
            {
                Month = monthStart.ToString("MMM"),
                Revenue = monthRevenue
            });
        }

        var yearlyTotal = await _unitOfWork.Invoices.GetAll()
            .Where(i => i.InvoiceDate >= startDate && i.InvoiceDate < endDate)
            .SumAsync(i => i.PaidAmount);

        return Ok(new
        {
            Year = targetYear,
            TotalRevenue = yearlyTotal,
            MonthlyBreakdown = monthlyData
        });
    }

    [HttpGet("treatments/statistics")]
    public async Task<IActionResult> GetTreatmentStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var procedureStats = await _unitOfWork.Treatments.GetAll()
            .Where(t => t.TreatmentDate >= start && t.TreatmentDate <= end)
            .Include(t => t.Procedure)
            .GroupBy(t => new { t.ProcedureId, t.Procedure.Name })
            .Select(g => new
            {
                ProcedureId = g.Key.ProcedureId,
                ProcedureName = g.Key.Name,
                Count = g.Count(),
                TotalCost = g.Sum(t => t.Cost),
                AverageCost = g.Average(t => t.Cost)
            })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync();

        return Ok(new
        {
            Period = new { Start = start, End = end },
            TopProcedures = procedureStats,
            TotalTreatments = await _unitOfWork.Treatments.CountAsync(t =>
                t.TreatmentDate >= start && t.TreatmentDate <= end)
        });
    }

    [HttpGet("inventory/low-stock-alert")]
    public async Task<IActionResult> GetLowStockAlert()
    {
        var lowStockItems = await _unitOfWork.InventoryItems
            .Find(i => i.IsActive && i.QuantityOnHand <= i.MinimumQuantity)
            .Select(i => new
            {
                i.Id,
                i.Name,
                i.SKU,
                Category = i.Category.ToString(),
                i.QuantityOnHand,
                i.MinimumQuantity,
                i.ReorderQuantity,
                i.Unit,
                i.UnitCost,
                ReorderCost = i.UnitCost * i.ReorderQuantity,
                StockLevel = i.QuantityOnHand <= 0 ? "Out of Stock" :
                            i.QuantityOnHand <= i.MinimumQuantity / 2 ? "Critical" : "Low"
            })
            .OrderBy(i => i.QuantityOnHand)
            .ToListAsync();

        return Ok(new
        {
            TotalItems = lowStockItems.Count,
            OutOfStock = lowStockItems.Count(i => i.StockLevel == "Out of Stock"),
            Critical = lowStockItems.Count(i => i.StockLevel == "Critical"),
            Low = lowStockItems.Count(i => i.StockLevel == "Low"),
            Items = lowStockItems
        });
    }

    [HttpGet("patients/recent")]
    public async Task<IActionResult> GetRecentPatients([FromQuery] int count = 10)
    {
        var patients = await _unitOfWork.Patients.GetAll()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.CreatedDate)
            .Take(count)
            .Select(p => new
            {
                p.Id,
                p.FullName,
                p.Email,
                p.PhoneNumber,
                p.DateOfBirth,
                Age = DateTime.UtcNow.Year - p.DateOfBirth.Year,
                p.CreatedDate,
                p.LastVisitDate
            })
            .ToListAsync();

        return Ok(patients);
    }

    [HttpGet("dentists/performance")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> GetDentistPerformance([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var performance = await _unitOfWork.Users.GetAll()
            .Where(u => u.Role == UserRole.ClinicalStaff && u.IsActive)
            .Select(u => new
            {
                DentistId = u.Id,
                DentistName = u.FullName,
                u.Specialization,
                TotalAppointments = u.Appointments.Count(a =>
                    a.AppointmentDate >= start && a.AppointmentDate <= end),
                CompletedAppointments = u.Appointments.Count(a =>
                    a.AppointmentDate >= start && a.AppointmentDate <= end &&
                    a.Status == AppointmentStatus.Completed),
                TotalTreatments = u.Treatments.Count(t =>
                    t.TreatmentDate >= start && t.TreatmentDate <= end),
                CompletedTreatments = u.Treatments.Count(t =>
                    t.TreatmentDate >= start && t.TreatmentDate <= end &&
                    t.Status == TreatmentStatus.Completed),
                TotalRevenue = u.Treatments
                    .Where(t => t.TreatmentDate >= start && t.TreatmentDate <= end)
                    .Sum(t => t.Cost)
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToListAsync();

        return Ok(new
        {
            Period = new { Start = start, End = end },
            DentistPerformance = performance
        });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var today = DateTime.UtcNow.Date;
        var thisMonth = new DateTime(today.Year, today.Month, 1);
        var lastMonth = thisMonth.AddMonths(-1);

        var summary = new
        {
            GeneratedAt = DateTime.UtcNow,
            CurrentDate = today,
            Statistics = new
            {
                TotalPatients = await _unitOfWork.Patients.CountAsync(p => p.IsActive),
                TotalAppointmentsToday = await _unitOfWork.Appointments.CountAsync(a =>
                    a.AppointmentDate.Date == today),
                TotalStaff = await _unitOfWork.Users.CountAsync(u => u.IsActive),
                LowStockItems = await _unitOfWork.InventoryItems.CountAsync(i =>
                    i.IsActive && i.QuantityOnHand <= i.MinimumQuantity)
            },
            Revenue = new
            {
                ThisMonth = await _unitOfWork.Invoices.GetAll()
                    .Where(i => i.InvoiceDate >= thisMonth)
                    .SumAsync(i => i.PaidAmount),
                LastMonth = await _unitOfWork.Invoices.GetAll()
                    .Where(i => i.InvoiceDate >= lastMonth && i.InvoiceDate < thisMonth)
                    .SumAsync(i => i.PaidAmount),
                Outstanding = await _unitOfWork.Invoices.GetAll()
                    .Where(i => i.Status != PaymentStatus.Paid && i.Status != PaymentStatus.Cancelled)
                    .SumAsync(i => i.BalanceAmount)
            }
        };

        return Ok(summary);
    }

    // NEW ANALYTICS ENDPOINTS

    [HttpGet("demographics/age-distribution")]
    public async Task<IActionResult> GetAgeDistribution()
    {
        var patients = await _unitOfWork.Patients.GetAll()
            .Where(p => p.IsActive)
            .Select(p => new
            {
                Age = DateTime.UtcNow.Year - p.DateOfBirth.Year
            })
            .ToListAsync();

        var ageGroups = patients
            .GroupBy(p => p.Age switch
            {
                < 18 => "0-17 (Children)",
                >= 18 and < 30 => "18-29 (Young Adults)",
                >= 30 and < 45 => "30-44 (Adults)",
                >= 45 and < 60 => "45-59 (Middle Age)",
                _ => "60+ (Seniors)"
            })
            .Select(g => new
            {
                AgeGroup = g.Key,
                Count = g.Count(),
                Percentage = Math.Round((g.Count() * 100.0) / patients.Count, 2)
            })
            .OrderBy(x => x.AgeGroup)
            .ToList();

        return Ok(ageGroups);
    }

    [HttpGet("demographics/gender-distribution")]
    public async Task<IActionResult> GetGenderDistribution()
    {
        // Calculate total count first (outside the main query)
        var totalPatients = await _unitOfWork.Patients.CountAsync(p => p.IsActive);

        var genderStats = await _unitOfWork.Patients.GetAll()
            .Where(p => p.IsActive)
            .GroupBy(p => p.Gender)
            .Select(g => new
            {
                Gender = g.Key.ToString(),
                Count = g.Count()
            })
            .ToListAsync();

        // Calculate percentage after materialization
        var result = genderStats.Select(g => new
        {
            g.Gender,
            g.Count,
            Percentage = totalPatients > 0 ? Math.Round((g.Count * 100.0) / totalPatients, 2) : 0
        }).ToList();

        return Ok(result);
    }

    [HttpGet("demographics/appointment-types")]
    public async Task<IActionResult> GetAppointmentTypeDistribution([FromQuery] string period = "month")
    {
        var now = DateTime.UtcNow;
        DateTime start;
        DateTime end = now;
        string periodLabel;

        // Calculate date range based on period
        switch (period.ToLower())
        {
            case "week":
                start = now.AddDays(-7);
                periodLabel = "Last 7 Days";
                break;
            case "month":
                start = now.AddMonths(-1);
                periodLabel = "Last Month";
                break;
            case "quarter":
                start = now.AddMonths(-3);
                periodLabel = "Last 3 Months";
                break;
            case "year":
                start = now.AddYears(-1);
                periodLabel = "Last Year";
                break;
            case "ytd": // Year to date
                start = new DateTime(now.Year, 1, 1);
                periodLabel = $"Year to Date ({now.Year})";
                break;
            default:
                start = now.AddMonths(-1);
                periodLabel = "Last Month";
                break;
        }

        // Get all appointments in the period
        var appointments = await _unitOfWork.Appointments.GetAll()
            .Where(a => a.AppointmentDate >= start && a.AppointmentDate <= end)
            .ToListAsync();

        var totalAppointments = appointments.Count;
        var walkInCount = appointments.Count(a => a.IsWalkIn);
        var scheduledCount = appointments.Count(a => !a.IsWalkIn);

        var result = new[]
        {
            new
            {
                Type = "Walk-in",
                Count = walkInCount,
                Percentage = totalAppointments > 0 ? Math.Round((walkInCount * 100.0) / totalAppointments, 2) : 0,
                Icon = "🚶"
            },
            new
            {
                Type = "Scheduled",
                Count = scheduledCount,
                Percentage = totalAppointments > 0 ? Math.Round((scheduledCount * 100.0) / totalAppointments, 2) : 0,
                Icon = "📅"
            }
        };

        return Ok(new
        {
            Period = new { Start = start, End = end, Label = periodLabel },
            TotalAppointments = totalAppointments,
            Distribution = result
        });
    }

    [HttpGet("treatments/by-procedure")]
    public async Task<IActionResult> GetTreatmentsByProcedure([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-3);
        var end = endDate ?? DateTime.UtcNow;

        var treatmentStats = await _unitOfWork.Treatments.GetAll()
            .Where(t => t.TreatmentDate >= start && t.TreatmentDate <= end)
            .Include(t => t.Procedure)
            .GroupBy(t => new { t.ProcedureId, t.Procedure.Name })
            .Select(g => new
            {
                ProcedureId = g.Key.ProcedureId,
                ProcedureName = g.Key.Name,
                Count = g.Count(),
                TotalRevenue = g.Sum(t => t.Cost),
                AverageCost = g.Average(t => t.Cost),
                CompletedCount = g.Count(t => t.Status == TreatmentStatus.Completed)
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return Ok(new
        {
            Period = new { Start = start, End = end },
            TreatmentStatistics = treatmentStats,
            TotalTreatments = treatmentStats.Sum(t => t.Count),
            TotalRevenue = treatmentStats.Sum(t => t.TotalRevenue)
        });
    }

    [HttpGet("treatments/monthly-trend")]
    public async Task<IActionResult> GetTreatmentMonthlyTrend([FromQuery] int? year = null)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var monthlyData = new List<object>();

        for (int month = 1; month <= 12; month++)
        {
            var monthStart = new DateTime(targetYear, month, 1);
            var monthEnd = monthStart.AddMonths(1);

            var treatmentCount = await _unitOfWork.Treatments.CountAsync(t =>
                t.TreatmentDate >= monthStart && t.TreatmentDate < monthEnd);

            var revenue = await _unitOfWork.Treatments.GetAll()
                .Where(t => t.TreatmentDate >= monthStart && t.TreatmentDate < monthEnd)
                .SumAsync(t => t.Cost);

            monthlyData.Add(new
            {
                Month = monthStart.ToString("MMM"),
                TreatmentCount = treatmentCount,
                Revenue = revenue
            });
        }

        return Ok(new
        {
            Year = targetYear,
            MonthlyTrend = monthlyData
        });
    }

    [HttpGet("inventory/by-category")]
    public async Task<IActionResult> GetInventoryByCategory()
    {
        var inventoryStats = await _unitOfWork.InventoryItems.GetAll()
            .Where(i => i.IsActive)
            .GroupBy(i => i.Category)
            .Select(g => new
            {
                Category = g.Key.ToString(),
                TotalItems = g.Count(),
                TotalQuantity = g.Sum(i => i.QuantityOnHand),
                TotalValue = g.Sum(i => i.QuantityOnHand * i.UnitCost),
                LowStockCount = g.Count(i => i.QuantityOnHand <= i.MinimumQuantity)
            })
            .ToListAsync();

        return Ok(inventoryStats);
    }

    [HttpGet("inventory/most-used")]
    public async Task<IActionResult> GetMostUsedInventory([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] int topCount = 10)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var usageStats = await _unitOfWork.TreatmentInventoryUsages.GetAll()
            .Where(u => u.UsageDate >= start && u.UsageDate <= end)
            .Include(u => u.InventoryItem)
            .GroupBy(u => new { u.InventoryItemId, u.InventoryItem.Name, u.InventoryItem.Category })
            .Select(g => new
            {
                ItemId = g.Key.InventoryItemId,
                ItemName = g.Key.Name,
                Category = g.Key.Category.ToString(),
                TimesUsed = g.Count(),
                TotalQuantityUsed = g.Sum(u => u.QuantityUsed),
                TotalCost = g.Sum(u => u.TotalCost)
            })
            .OrderByDescending(x => x.TimesUsed)
            .Take(topCount)
            .ToListAsync();

        return Ok(new
        {
            Period = new { Start = start, End = end },
            MostUsedItems = usageStats
        });
    }

    [HttpGet("appointments/pattern")]
    public async Task<IActionResult> GetAppointmentPattern([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var appointments = await _unitOfWork.Appointments.GetAll()
            .Where(a => a.AppointmentDate >= start && a.AppointmentDate <= end)
            .ToListAsync();

        var byDay = appointments
            .GroupBy(a => a.AppointmentDate.DayOfWeek)
            .Select(g => new
            {
                DayOfWeek = g.Key.ToString(),
                Count = g.Count(),
                CompletedCount = g.Count(a => a.Status == AppointmentStatus.Completed)
            })
            .OrderBy(x => x.DayOfWeek)
            .ToList();

        var byStatus = appointments
            .GroupBy(a => a.Status)
            .Select(g => new
            {
                Status = g.Key.ToString(),
                Count = g.Count()
            })
            .ToList();

        return Ok(new
        {
            Period = new { Start = start, End = end },
            TotalAppointments = appointments.Count,
            ByDayOfWeek = byDay,
            ByStatus = byStatus
        });
    }

    [HttpGet("revenue/breakdown")]
    public async Task<IActionResult> GetRevenueBreakdown([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var invoices = await _unitOfWork.Invoices.GetAll()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate <= end)
            .Include(i => i.InvoiceItems)
                .ThenInclude(ii => ii.Treatment)
                    .ThenInclude(t => t.Procedure)
            .ToListAsync();

        var totalRevenue = invoices.Sum(i => i.TotalAmount);
        var paidRevenue = invoices.Sum(i => i.PaidAmount);
        var outstandingRevenue = invoices.Sum(i => i.BalanceAmount);

        var byPaymentMethod = invoices
            .SelectMany(i => i.Payments)
            .GroupBy(p => p.PaymentMethod)
            .Select(g => new
            {
                PaymentMethod = g.Key.ToString(),
                Amount = g.Sum(p => p.Amount),
                Count = g.Count()
            })
            .ToList();

        return Ok(new
        {
            Period = new { Start = start, End = end },
            TotalRevenue = totalRevenue,
            PaidRevenue = paidRevenue,
            OutstandingRevenue = outstandingRevenue,
            CollectionRate = totalRevenue > 0 ? Math.Round((paidRevenue / totalRevenue) * 100, 2) : 0,
            ByPaymentMethod = byPaymentMethod
        });
    }
}
