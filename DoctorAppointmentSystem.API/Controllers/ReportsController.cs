using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanViewReports)]
public class ReportsController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public ReportsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    // ── Revenue Report ────────────────────────────────────────────────────────
    // GET api/reports/revenue?from=2025-01-01&to=2025-12-31&groupBy=month
    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] string groupBy = "month") // day | week | month
    {
        var fromDate = from?.ToUniversalTime() ?? DateTime.UtcNow.AddMonths(-12);
        var toDate = (to?.ToUniversalTime() ?? DateTime.UtcNow).AddDays(1);

        var invoices = await _uow.Invoices.FindAsync(
            i => i.InvoiceDate >= fromDate && i.InvoiceDate < toDate);

        var payments = await _uow.Payments.FindAsync(
            p => p.PaymentDate >= fromDate && p.PaymentDate < toDate);

        var revenueByPeriod = groupBy.ToLower() switch
        {
            "day" => invoices.GroupBy(i => i.InvoiceDate.Date.ToString("yyyy-MM-dd"))
                             .Select(g => new { Period = g.Key, Billed = g.Sum(i => i.TotalAmount), Collected = g.Sum(i => i.PaidAmount) })
                             .OrderBy(x => x.Period).ToList<object>(),
            "week" => invoices.GroupBy(i => $"{i.InvoiceDate.Year}-W{System.Globalization.ISOWeek.GetWeekOfYear(i.InvoiceDate):D2}")
                              .Select(g => new { Period = g.Key, Billed = g.Sum(i => i.TotalAmount), Collected = g.Sum(i => i.PaidAmount) })
                              .OrderBy(x => x.Period).ToList<object>(),
            _ => invoices.GroupBy(i => i.InvoiceDate.ToString("yyyy-MM"))
                         .Select(g => new { Period = g.Key, Billed = g.Sum(i => i.TotalAmount), Collected = g.Sum(i => i.PaidAmount) })
                         .OrderBy(x => x.Period).ToList<object>()
        };

        var outstanding = invoices
            .Where(i => i.Status != PaymentStatus.Paid && i.Status != PaymentStatus.Cancelled)
            .Sum(i => i.BalanceAmount);

        var paymentsByMethod = payments
            .GroupBy(p => p.PaymentMethod.ToString())
            .Select(g => new { Method = g.Key, Total = g.Sum(p => p.Amount), Count = g.Count() })
            .ToList();

        return Ok(new
        {
            TotalBilled = invoices.Sum(i => i.TotalAmount),
            TotalCollected = invoices.Sum(i => i.PaidAmount),
            OutstandingBalance = outstanding,
            ByPeriod = revenueByPeriod,
            PaymentsByMethod = paymentsByMethod
        });
    }

    // ── Appointment Report ────────────────────────────────────────────────────
    // GET api/reports/appointments?from=&to=&doctorId=
    [HttpGet("appointments")]
    public async Task<IActionResult> Appointments(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int? doctorId)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-3);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var appts = (await _uow.Appointments.FindAsync(
            a => a.AppointmentDate >= fromDate && a.AppointmentDate < toDate))
            .ToList();

        if (doctorId.HasValue)
            appts = appts.Where(a => a.DentistId == doctorId.Value).ToList();

        var byStatus = appts.GroupBy(a => a.Status.ToString())
            .Select(g => new { Status = g.Key, Count = g.Count() }).ToList();

        var byDoctor = appts.GroupBy(a => a.DentistId)
            .Select(g => new { DoctorId = g.Key, Count = g.Count() }).ToList();

        var byDay = appts.GroupBy(a => a.AppointmentDate.DayOfWeek.ToString())
            .Select(g => new { Day = g.Key, Count = g.Count() }).ToList();

        var byMonth = appts.GroupBy(a => a.AppointmentDate.ToString("yyyy-MM"))
            .Select(g => new { Month = g.Key, Total = g.Count(), WalkIn = g.Count(a => a.IsWalkIn), Scheduled = g.Count(a => !a.IsWalkIn) })
            .OrderBy(x => x.Month).ToList();

        return Ok(new
        {
            Total = appts.Count,
            WalkIn = appts.Count(a => a.IsWalkIn),
            Scheduled = appts.Count(a => !a.IsWalkIn),
            Completed = appts.Count(a => a.Status == AppointmentStatus.Completed),
            Cancelled = appts.Count(a => a.Status == AppointmentStatus.Cancelled),
            NoShow = appts.Count(a => a.Status == AppointmentStatus.NoShow),
            ByStatus = byStatus,
            ByDoctor = byDoctor,
            ByDayOfWeek = byDay,
            ByMonth = byMonth
        });
    }

    // ── Treatment Report ──────────────────────────────────────────────────────
    // GET api/reports/treatments?from=&to=
    [HttpGet("treatments")]
    public async Task<IActionResult> Treatments(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-3);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var treatments = _uow.Treatments.GetAll()
            .Include(t => t.Procedure)
            .Where(t => t.TreatmentDate >= fromDate && t.TreatmentDate < toDate)
            .ToList();

        var byProcedure = treatments.GroupBy(t => t.Procedure?.Name ?? "Unknown")
            .Select(g => new { Procedure = g.Key, Count = g.Count(), Revenue = g.Sum(t => t.Cost) })
            .OrderByDescending(x => x.Count).Take(15).ToList();

        var byStatus = treatments.GroupBy(t => t.Status.ToString())
            .Select(g => new { Status = g.Key, Count = g.Count() }).ToList();

        var byMonth = treatments.GroupBy(t => t.TreatmentDate.ToString("yyyy-MM"))
            .Select(g => new { Month = g.Key, Count = g.Count(), Revenue = g.Sum(t => t.Cost) })
            .OrderBy(x => x.Month).ToList();

        return Ok(new
        {
            Total = treatments.Count,
            TotalRevenue = treatments.Sum(t => t.Cost),
            ByProcedure = byProcedure,
            ByStatus = byStatus,
            ByMonth = byMonth
        });
    }

    // ── Provider Performance ───────────────────────────────────────────────────
    // GET api/reports/providers?from=&to=
    [HttpGet("providers")]
    public async Task<IActionResult> Providers(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-3);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var dentists = (await _uow.Users.FindAsync(
            u => u.Role == UserRole.ClinicalStaff && u.IsActive)).ToList();

        var appointments = (await _uow.Appointments.FindAsync(
            a => a.AppointmentDate >= fromDate && a.AppointmentDate < toDate)).ToList();

        var treatments = _uow.Treatments.GetAll()
            .Where(t => t.TreatmentDate >= fromDate && t.TreatmentDate < toDate)
            .ToList();

        var providers = dentists.Select(d => new
        {
            d.Id,
            Name = d.FullName,
            d.Specialization,
            AppointmentCount = appointments.Count(a => a.DentistId == d.Id),
            CompletedAppointments = appointments.Count(a => a.DentistId == d.Id && a.Status == AppointmentStatus.Completed),
            TreatmentCount = treatments.Count(t => t.DentistId == d.Id),
            Revenue = treatments.Where(t => t.DentistId == d.Id).Sum(t => t.Cost)
        }).OrderByDescending(p => p.Revenue).ToList();

        return Ok(providers);
    }

    // ── Patient Statistics ─────────────────────────────────────────────────────
    // GET api/reports/patients
    [HttpGet("patients")]
    public async Task<IActionResult> PatientStats()
    {
        var patients = (await _uow.Patients.FindAsync(p => p.IsActive)).ToList();
        var invoices = (await _uow.Invoices.GetAllAsync()).ToList();

        var newByMonth = patients.GroupBy(p => p.CreatedDate.ToString("yyyy-MM"))
            .Select(g => new { Month = g.Key, Count = g.Count() })
            .OrderBy(x => x.Month).TakeLast(12).ToList();

        var topPatientsByRevenue = invoices
            .GroupBy(i => i.PatientId)
            .Select(g => new { PatientId = g.Key, Total = g.Sum(i => i.TotalAmount) })
            .OrderByDescending(x => x.Total).Take(10).ToList();

        return Ok(new
        {
            Total = patients.Count,
            WithPortalAccess = patients.Count(p => p.UserId.HasValue),
            NewByMonth = newByMonth,
            TopByRevenue = topPatientsByRevenue
        });
    }

    // ── CSV Export ─────────────────────────────────────────────────────────────
    // GET api/reports/export/revenue?from=&to=
    [HttpGet("export/revenue")]
    public async Task<IActionResult> ExportRevenueCsv(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-12);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var invoices = _uow.Invoices.GetAll()
            .Include(i => i.Patient)
            .Where(i => i.InvoiceDate >= fromDate && i.InvoiceDate < toDate)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine("InvoiceNumber,Date,Patient,Total,Paid,Balance,Status");
        foreach (var inv in invoices)
        {
            sb.AppendLine($"{inv.InvoiceNumber},{inv.InvoiceDate:yyyy-MM-dd}," +
                          $"\"{inv.Patient?.FullName ?? ""}\",{inv.TotalAmount},{inv.PaidAmount},{inv.BalanceAmount},{inv.Status}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"revenue_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.csv");
    }

    // GET api/reports/export/appointments?from=&to=
    [HttpGet("export/appointments")]
    public async Task<IActionResult> ExportAppointmentsCsv(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-3);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var appts = _uow.Appointments.GetAll()
            .Include(a => a.Patient)
            .Include(a => a.Dentist)
            .Where(a => a.AppointmentDate >= fromDate && a.AppointmentDate < toDate)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Id,Date,Time,Patient,Dentist,Purpose,Status,WalkIn");
        foreach (var a in appts)
        {
            sb.AppendLine($"{a.Id},{a.AppointmentDate:yyyy-MM-dd},{a.StartTime}," +
                          $"\"{a.Patient?.FullName ?? ""}\",\"{a.Dentist?.FullName ?? ""}\"," +
                          $"\"{a.Purpose}\",{a.Status},{a.IsWalkIn}");
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv",
            $"appointments_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.csv");
    }

    // ── Phase 6: Clinical Performance ────────────────────────────────────────

    // GET api/reports/clinical/doctor-performance?from=&to=
    [HttpGet("clinical/doctor-performance")]
    [HttpGet("clinical/dentist-performance")] // kept for backward compatibility
    public async Task<IActionResult> DentistPerformance(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-3);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var treatments = await _uow.Treatments.FindAsync(
            t => t.TreatmentDate >= fromDate && t.TreatmentDate < toDate);

        var appointments = await _uow.Appointments.FindAsync(
            a => a.AppointmentDate >= fromDate && a.AppointmentDate < toDate &&
                 a.Status != AppointmentStatus.Cancelled);

        var users = await _uow.Users.GetAllAsync();

        var dentistMap = users.ToDictionary(u => u.Id, u => u.FullName);

        var performanceByDentist = treatments
            .GroupBy(t => t.DentistId)
            .Select(g =>
            {
                var dentistAppts = appointments.Where(a => a.DentistId == g.Key).ToList();
                var avgDuration = dentistAppts
                    .Select(a => (a.EndTime - a.StartTime).TotalMinutes)
                    .DefaultIfEmpty(0)
                    .Average();

                return new
                {
                    DentistId = g.Key,
                    DentistName = dentistMap.GetValueOrDefault(g.Key, "Unknown"),
                    TreatmentsCompleted = g.Count(t => t.Status == TreatmentStatus.Completed),
                    TreatmentsPlanned = g.Count(t => t.Status == TreatmentStatus.Planned),
                    TotalRevenue = g.Sum(t => t.Cost),
                    AppointmentCount = dentistAppts.Count,
                    AvgAppointmentDurationMinutes = Math.Round(avgDuration, 1)
                };
            })
            .OrderByDescending(d => d.TotalRevenue)
            .ToList();

        return Ok(new
        {
            From = fromDate,
            To = toDate,
            Dentists = performanceByDentist
        });
    }

    // GET api/reports/clinical/procedure-frequency?from=&to=
    [HttpGet("clinical/procedure-frequency")]
    public async Task<IActionResult> ProcedureFrequency(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-3);
        var toDate = (to ?? DateTime.UtcNow).AddDays(1);

        var treatments = await _uow.Treatments.FindAsync(
            t => t.TreatmentDate >= fromDate && t.TreatmentDate < toDate);

        var procedures = await _uow.Procedures.GetAllAsync();
        var procedureMap = procedures.ToDictionary(p => p.Id, p => new { p.Name, p.Code });

        var frequency = treatments
            .GroupBy(t => t.ProcedureId)
            .Select(g =>
            {
                var proc = g.Key.HasValue ? procedureMap.GetValueOrDefault(g.Key.Value) : null;
                return new
                {
                    ProcedureId = g.Key,
                    ProcedureName = proc?.Name ?? "Unknown",
                    ProcedureCode = proc?.Code ?? "",
                    Count = g.Count(),
                    TotalRevenue = g.Sum(t => t.Cost),
                    AvgCost = g.Average(t => t.Cost)
                };
            })
            .OrderByDescending(p => p.Count)
            .ToList();

        return Ok(new
        {
            From = fromDate,
            To = toDate,
            Procedures = frequency
        });
    }

    // GET api/reports/clinical/revenue-per-dentist?year=&month=
    [HttpGet("clinical/revenue-per-dentist")]
    public async Task<IActionResult> RevenuePerDentist(
        [FromQuery] int? year, [FromQuery] int? month)
    {
        var y = year ?? DateTime.Today.Year;
        var fromDate = month.HasValue
            ? new DateTime(y, month.Value, 1)
            : new DateTime(y, 1, 1);
        var toDate = month.HasValue
            ? fromDate.AddMonths(1)
            : fromDate.AddYears(1);

        var treatments = await _uow.Treatments.FindAsync(
            t => t.TreatmentDate >= fromDate && t.TreatmentDate < toDate &&
                 t.Status == TreatmentStatus.Completed);

        var users = await _uow.Users.GetAllAsync();
        var dentistMap = users.ToDictionary(u => u.Id, u => u.FullName);

        var result = treatments
            .GroupBy(t => t.DentistId)
            .Select(g => new
            {
                DentistId = g.Key,
                DentistName = dentistMap.GetValueOrDefault(g.Key, "Unknown"),
                Revenue = g.Sum(t => t.Cost),
                TreatmentCount = g.Count()
            })
            .OrderByDescending(d => d.Revenue)
            .ToList();

        return Ok(new
        {
            Year = y,
            Month = month,
            Data = result,
            TotalRevenue = result.Sum(d => d.Revenue)
        });
    }
}
