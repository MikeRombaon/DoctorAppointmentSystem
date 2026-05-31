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
[Authorize(Policy = Policies.CanPerformTreatments)] // Admin, Dentist, DentalHygienist
public class DentalRecordsController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public DentalRecordsController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? patientId = null,
        [FromQuery] bool? isResolved = null)
    {
        IQueryable<DentalRecord> query = _unitOfWork.DentalRecords.GetAll()
            .Include(dr => dr.Patient);

        if (patientId.HasValue)
        {
            query = query.Where(dr => dr.PatientId == patientId.Value);
        }

        if (isResolved.HasValue)
        {
            query = query.Where(dr => dr.IsResolved == isResolved.Value);
        }

        query = query.OrderByDescending(dr => dr.RecordDate);

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
        var record = await _unitOfWork.DentalRecords
            .Find(dr => dr.Id == id)
            .Include(dr => dr.Patient)
            .FirstOrDefaultAsync();

        if (record == null)
            return NotFound(new { message = "Dental record not found" });

        return Ok(record);
    }

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var records = await _unitOfWork.DentalRecords
            .Find(dr => dr.PatientId == patientId)
            .OrderBy(dr => dr.ToothPosition)
            .ThenByDescending(dr => dr.RecordDate)
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("patient/{patientId}/chart")]
    public async Task<IActionResult> GetDentalChart(int patientId)
    {
        // Validate patient exists
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == patientId))
            return NotFound(new { message = "Patient not found" });

        var records = await _unitOfWork.DentalRecords
            .Find(dr => dr.PatientId == patientId && !dr.IsResolved)
            .OrderBy(dr => dr.ToothPosition)
            .ToListAsync();

        // Group by tooth position for dental chart visualization
        var dentalChart = records
            .GroupBy(dr => dr.ToothPosition)
            .Select(g => new
            {
                ToothPosition = g.Key,
                ToothNumber = (int)g.Key,
                Conditions = g.Select(dr => new
                {
                    dr.Id,
                    dr.Condition,
                    dr.Notes,
                    dr.RecordDate,
                    dr.IsResolved
                }).ToList(),
                HasIssues = g.Any(dr => !dr.IsResolved)
            })
            .OrderBy(t => t.ToothNumber)
            .ToList();

        return Ok(dentalChart);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DentalRecord dentalRecord)
    {
        // Validate patient exists
        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == dentalRecord.PatientId))
            return BadRequest(new { message = "Invalid patient ID" });

        dentalRecord.RecordDate = DateTime.UtcNow;
        dentalRecord.TenantId = _tenantContext.TenantId ?? 0;

        await _unitOfWork.DentalRecords.AddAsync(dentalRecord);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = dentalRecord.Id }, dentalRecord);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] DentalRecord dentalRecord)
    {
        var existing = await _unitOfWork.DentalRecords.GetByIdAsync(id);
        if (existing == null)
            return NotFound(new { message = "Dental record not found" });

        existing.Condition = dentalRecord.Condition;
        existing.Notes = dentalRecord.Notes;
        existing.IsResolved = dentalRecord.IsResolved;
        existing.ToothPosition = dentalRecord.ToothPosition;

        _unitOfWork.DentalRecords.Update(existing);
        await _unitOfWork.SaveChangesAsync();

        return Ok(existing);
    }

    [HttpPatch("{id}/resolve")]
    public async Task<IActionResult> Resolve(int id)
    {
        var record = await _unitOfWork.DentalRecords.GetByIdAsync(id);
        if (record == null)
            return NotFound(new { message = "Dental record not found" });

        record.IsResolved = true;
        _unitOfWork.DentalRecords.Update(record);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Dental record marked as resolved", record });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await _unitOfWork.DentalRecords.GetByIdAsync(id);
        if (record == null)
            return NotFound(new { message = "Dental record not found" });

        _unitOfWork.DentalRecords.Remove(record);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("patient/{patientId}/history")]
    public async Task<IActionResult> GetPatientHistory(int patientId)
    {
        var records = await _unitOfWork.DentalRecords
            .Find(dr => dr.PatientId == patientId)
            .OrderByDescending(dr => dr.RecordDate)
            .Take(50)
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("unresolved")]
    public async Task<IActionResult> GetUnresolved([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _unitOfWork.DentalRecords.GetAll()
            .Where(dr => !dr.IsResolved)
            .Include(dr => dr.Patient)
            .OrderByDescending(dr => dr.RecordDate);

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
