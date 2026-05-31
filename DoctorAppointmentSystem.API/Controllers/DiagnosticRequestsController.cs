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
[Authorize(Policy = Policies.CanPerformTreatments)]
public class DiagnosticRequestsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public DiagnosticRequestsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? patientId = null,
        [FromQuery] DiagnosticRequestStatus? status = null,
        [FromQuery] string? search = null)
    {
        IQueryable<DiagnosticRequest> query = _unitOfWork.DiagnosticRequests.GetAll()
            .Include(r => r.Patient)
            .Include(r => r.OrderedByDoctor);

        if (patientId.HasValue)
            query = query.Where(r => r.PatientId == patientId.Value);

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r =>
                r.TestName.Contains(search) ||
                r.TestType.Contains(search) ||
                r.RequestNumber.Contains(search) ||
                r.Patient.FirstName.Contains(search) ||
                r.Patient.LastName.Contains(search));

        query = query.OrderByDescending(r => r.RequestDate);

        var result = await query.ToPaginatedListAsync(page, pageSize);

        return Ok(new
        {
            items = result.Items,
            totalCount = result.TotalCount,
            pageNumber = page,
            pageSize = pageSize,
        });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var all = _unitOfWork.DiagnosticRequests.GetAll();
        return Ok(new
        {
            pending = await all.CountAsync(r => r.Status == DiagnosticRequestStatus.Pending),
            collected = await all.CountAsync(r => r.Status == DiagnosticRequestStatus.Collected),
            processing = await all.CountAsync(r => r.Status == DiagnosticRequestStatus.Processing),
            resulted = await all.CountAsync(r => r.Status == DiagnosticRequestStatus.Resulted),
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var request = await _unitOfWork.DiagnosticRequests.GetAll()
            .Include(r => r.Patient)
            .Include(r => r.OrderedByDoctor)
            .Include(r => r.Appointment)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null)
            return NotFound(new { message = "Diagnostic request not found" });

        return Ok(request);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDiagnosticRequestDto dto)
    {
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == dto.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        if (!await _unitOfWork.Users.AnyAsync(u => u.Id == dto.OrderedByDoctorId))
            return BadRequest(new { message = "Invalid doctor ID" });

        var lastReq = await _unitOfWork.DiagnosticRequests.GetAll()
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync();

        var requestNumber = $"DX-{DateTime.Now:yyyyMMdd}-{(lastReq?.Id ?? 0) + 1:D4}";

        var entity = new DiagnosticRequest
        {
            RequestNumber = requestNumber,
            PatientId = dto.PatientId,
            OrderedByDoctorId = dto.OrderedByDoctorId,
            AppointmentId = dto.AppointmentId,
            TestType = dto.TestType,
            TestName = dto.TestName,
            Urgency = dto.Urgency ?? "Routine",
            ClinicalIndication = dto.ClinicalIndication,
            SpecialInstructions = dto.SpecialInstructions,
            Notes = dto.Notes,
            Status = DiagnosticRequestStatus.Pending,
            RequestDate = DateTime.UtcNow,
            CreatedDate = DateTime.UtcNow,
            TenantId = _tenantContext.TenantId ?? 0,
        };

        await _unitOfWork.DiagnosticRequests.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDiagnosticRequestDto dto)
    {
        var entity = await _unitOfWork.DiagnosticRequests.GetByIdAsync(id);
        if (entity == null)
            return NotFound(new { message = "Diagnostic request not found" });

        entity.TestType = dto.TestType ?? entity.TestType;
        entity.TestName = dto.TestName ?? entity.TestName;
        entity.Urgency = dto.Urgency ?? entity.Urgency;
        entity.ClinicalIndication = dto.ClinicalIndication ?? entity.ClinicalIndication;
        entity.SpecialInstructions = dto.SpecialInstructions ?? entity.SpecialInstructions;
        entity.Status = dto.Status ?? entity.Status;
        entity.ResultsSummary = dto.ResultsSummary ?? entity.ResultsSummary;
        entity.ResultDate = dto.ResultDate ?? entity.ResultDate;
        entity.PerformedByLab = dto.PerformedByLab ?? entity.PerformedByLab;
        entity.Notes = dto.Notes ?? entity.Notes;
        entity.ModifiedDate = DateTime.UtcNow;

        _unitOfWork.DiagnosticRequests.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _unitOfWork.DiagnosticRequests.GetByIdAsync(id);
        if (entity == null)
            return NotFound(new { message = "Diagnostic request not found" });

        _unitOfWork.DiagnosticRequests.Remove(entity);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Diagnostic request deleted" });
    }
}

public class CreateDiagnosticRequestDto
{
    public int PatientId { get; set; }
    public int OrderedByDoctorId { get; set; }
    public int? AppointmentId { get; set; }
    public string TestType { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? Urgency { get; set; }
    public string? ClinicalIndication { get; set; }
    public string? SpecialInstructions { get; set; }
    public string? Notes { get; set; }
}

public class UpdateDiagnosticRequestDto
{
    public string? TestType { get; set; }
    public string? TestName { get; set; }
    public string? Urgency { get; set; }
    public string? ClinicalIndication { get; set; }
    public string? SpecialInstructions { get; set; }
    public DiagnosticRequestStatus? Status { get; set; }
    public string? ResultsSummary { get; set; }
    public DateTime? ResultDate { get; set; }
    public string? PerformedByLab { get; set; }
    public string? Notes { get; set; }
}
