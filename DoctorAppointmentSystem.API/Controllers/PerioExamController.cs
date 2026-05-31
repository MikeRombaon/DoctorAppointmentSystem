using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)]
public class PerioExamController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly TenantContext _tenantContext;

    public PerioExamController(IUnitOfWork unitOfWork, TenantContext tenantContext)
    {
        _unitOfWork = unitOfWork;
        _tenantContext = tenantContext;
    }

    /// <summary>Get all perio exams for a patient (summary list, no sites).</summary>
    [HttpGet("patient/{patientId}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var exams = await _unitOfWork.PerioExams
            .Find(e => e.PatientId == patientId)
            .Include(e => e.ExaminedByUser)
            .OrderByDescending(e => e.ExamDate)
            .ToListAsync();

        return Ok(exams.Select(e => new
        {
            e.Id,
            e.PatientId,
            e.AppointmentId,
            e.ExamDate,
            e.ClinicalNotes,
            examinedBy = e.ExaminedByUser != null
                ? $"{e.ExaminedByUser.FirstName} {e.ExaminedByUser.LastName}" : null,
            siteCount = 0 // loaded separately
        }));
    }

    /// <summary>Get a single perio exam with all site measurements.</summary>
    [HttpGet("{id}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetById(int id)
    {
        var exam = await _unitOfWork.PerioExams
            .Find(e => e.Id == id)
            .Include(e => e.ExaminedByUser)
            .Include(e => e.Sites)
            .FirstOrDefaultAsync();

        if (exam == null)
            return NotFound(new { message = "Perio exam not found" });

        return Ok(new
        {
            exam.Id,
            exam.PatientId,
            exam.AppointmentId,
            exam.ExamDate,
            exam.ClinicalNotes,
            examinedBy = exam.ExaminedByUser != null
                ? $"{exam.ExaminedByUser.FirstName} {exam.ExaminedByUser.LastName}" : null,
            sites = exam.Sites.Select(s => new
            {
                s.Id,
                s.ToothFdi,
                s.Site,
                s.ProbingDepth,
                s.Recession,
                cal = s.CAL,
                s.Bleeding,
                s.Suppuration,
                s.Furcation,
                s.Mobility
            })
        });
    }

    /// <summary>Create a new perio exam with all site measurements.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePerioExamRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        var exam = new PerioExam
        {
            PatientId = request.PatientId,
            AppointmentId = request.AppointmentId,
            ExaminedByUserId = userId.Value,
            ExamDate = DateTime.UtcNow,
            ClinicalNotes = request.ClinicalNotes,
            TenantId = _tenantContext.TenantId ?? 0,
            Sites = request.Sites.Select(s => new PerioExamSite
            {
                ToothFdi = s.ToothFdi,
                Site = s.Site,
                ProbingDepth = s.ProbingDepth,
                Recession = s.Recession,
                Bleeding = s.Bleeding,
                Suppuration = s.Suppuration,
                Furcation = s.Furcation,
                Mobility = s.Mobility
            }).ToList()
        };

        await _unitOfWork.PerioExams.AddAsync(exam);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = exam.Id }, new { exam.Id, exam.PatientId });
    }

    /// <summary>Update clinical notes on an existing exam.</summary>
    [HttpPatch("{id}/notes")]
    public async Task<IActionResult> UpdateNotes(int id, [FromBody] string clinicalNotes)
    {
        var exam = await _unitOfWork.PerioExams
            .Find(e => e.Id == id)
            .FirstOrDefaultAsync();

        if (exam == null)
            return NotFound(new { message = "Perio exam not found" });

        exam.ClinicalNotes = clinicalNotes;
        _unitOfWork.PerioExams.Update(exam);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Notes updated" });
    }
}

public record CreatePerioExamRequest(
    int PatientId,
    int? AppointmentId,
    string? ClinicalNotes,
    IList<PerioExamSiteRequest> Sites);

public record PerioExamSiteRequest(
    int ToothFdi,
    string Site,
    int? ProbingDepth,
    int? Recession,
    bool Bleeding,
    bool Suppuration,
    bool Furcation,
    int? Mobility);
