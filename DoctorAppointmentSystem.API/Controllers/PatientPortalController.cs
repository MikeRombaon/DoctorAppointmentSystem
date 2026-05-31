using DoctorAppointmentSystem.Domain.Enums;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DoctorAppointmentSystem.API.Controllers;

/// <summary>
/// Patient self-service portal — patients see only their own data.
/// </summary>
[ApiController]
[Route("api/portal")]
[Authorize(Policy = "CanViewOwnRecords")]
public class PatientPortalController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public PatientPortalController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    // ── helpers ──────────────────────────────────────────
    private async Task<int?> ResolvePatientIdAsync()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
            return null;
        var patient = (await _uow.Patients.FindAsync(p => p.UserId == uid)).FirstOrDefault();
        return patient?.Id;
    }

    // GET api/portal/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound("No patient profile linked to this account.");

        var patient = await _uow.Patients.GetByIdAsync(patientId.Value);

        var appointments = (await _uow.Appointments.FindAsync(
            a => a.PatientId == patientId.Value))
            .OrderByDescending(a => a.AppointmentDate).ToList();

        var invoices = (await _uow.Invoices.FindAsync(
            i => i.PatientId == patientId.Value))
            .OrderByDescending(i => i.InvoiceDate).ToList();

        // Treatments are linked through appointments
        var appointmentIds = appointments.Select(a => a.Id).ToHashSet();
        var treatments = (await _uow.Treatments.FindAsync(
            t => appointmentIds.Contains(t.AppointmentId)))
            .OrderByDescending(t => t.TreatmentDate).ToList();

        var now = DateTime.Today;
        return Ok(new
        {
            Patient = new
            {
                patient!.Id, patient.FullName, patient.Email, patient.PhoneNumber,
                patient.DateOfBirth, patient.LastVisitDate,
                Age = now.Year - patient.DateOfBirth.Year -
                      (now < patient.DateOfBirth.AddYears(now.Year - patient.DateOfBirth.Year) ? 1 : 0)
            },
            UpcomingAppointments = appointments
                .Where(a => a.AppointmentDate >= DateTime.Today && a.Status != AppointmentStatus.Cancelled)
                .Take(5)
                .Select(a => new { a.Id, a.AppointmentDate, a.StartTime, a.Purpose, a.Status }),
            RecentTreatments = treatments.Take(5)
                .Select(t => new { t.Id, t.TreatmentDate, t.Status, t.Cost }),
            OutstandingBalance = invoices
                .Where(i => i.Status != PaymentStatus.Paid && i.Status != PaymentStatus.Cancelled)
                .Sum(i => i.BalanceAmount),
            TotalAppointments = appointments.Count,
            TotalTreatments = treatments.Count,
            TotalInvoices = invoices.Count
        });
    }

    // GET api/portal/appointments
    [HttpGet("appointments")]
    [Authorize(Policy = "CanScheduleOwnAppointments")]
    public async Task<IActionResult> GetAppointments([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        var query = (await _uow.Appointments.FindAsync(a => a.PatientId == patientId.Value))
            .OrderByDescending(a => a.AppointmentDate).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status, true, out var statusEnum))
            query = query.Where(a => a.Status == statusEnum);

        var total = query.Count();
        var items = query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new
            {
                a.Id, a.AppointmentDate, a.StartTime, a.EndTime,
                a.Purpose, a.Status, a.Notes, a.IsWalkIn
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/portal/invoices
    [HttpGet("invoices")]
    [Authorize(Policy = "CanViewOwnInvoices")]
    public async Task<IActionResult> GetInvoices([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        var all = (await _uow.Invoices.FindAsync(i => i.PatientId == patientId.Value))
            .OrderByDescending(i => i.InvoiceDate).ToList();

        var total = all.Count;
        var items = all.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(i => new
            {
                i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate,
                i.TotalAmount, i.PaidAmount, i.BalanceAmount, i.Status
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/portal/treatments
    [HttpGet("treatments")]
    public async Task<IActionResult> GetTreatments([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        // Treatments are linked through appointments
        var appointmentIds = (await _uow.Appointments.FindAsync(a => a.PatientId == patientId.Value))
            .Select(a => a.Id).ToHashSet();

        var all = (await _uow.Treatments.FindAsync(t => appointmentIds.Contains(t.AppointmentId)))
            .OrderByDescending(t => t.TreatmentDate).ToList();

        var total = all.Count;
        var items = all.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new
            {
                t.Id, t.TreatmentDate, t.Status, t.Cost,
                t.Diagnosis, t.Notes
            }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    // GET api/portal/documents
    [HttpGet("documents")]
    public async Task<IActionResult> GetDocuments()
    {
        var patientId = await ResolvePatientIdAsync();
        if (patientId == null) return NotFound();

        var docs = (await _uow.PatientDocuments.FindAsync(
            d => d.PatientId == patientId.Value && d.IsActive))
            .OrderByDescending(d => d.UploadedDate)
            .Select(d => new
            {
                d.Id, d.FileName, d.ContentType, d.FileSizeBytes,
                d.Category, d.Description, d.UploadedDate
            }).ToList();

        return Ok(docs);
    }
}
