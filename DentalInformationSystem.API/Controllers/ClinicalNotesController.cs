using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Domain.Enums;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.CanPerformTreatments)]
public class ClinicalNotesController : BaseController
{
    private readonly IUnitOfWork _unitOfWork;

    public ClinicalNotesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>Get clinical notes for a patient, latest first.</summary>
    [HttpGet("patient/{patientId}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetByPatient(int patientId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var notes = await _unitOfWork.ClinicalNotes
            .Find(n => n.PatientId == patientId && n.AmendedFromId == null)
            .Include(n => n.AuthoredByUser)
            .OrderByDescending(n => n.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(notes.Select(MapToDto));
    }

    /// <summary>Get a single note with its amendment chain.</summary>
    [HttpGet("{id}")]
    [Authorize(Policy = Policies.CanManagePatients)]
    public async Task<IActionResult> GetById(int id)
    {
        var note = await _unitOfWork.ClinicalNotes
            .Find(n => n.Id == id)
            .Include(n => n.AuthoredByUser)
            .FirstOrDefaultAsync();

        if (note == null)
            return NotFound(new { message = "Clinical note not found" });

        return Ok(MapToDto(note));
    }

    /// <summary>Create a new draft SOAP note.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ClinicalNoteRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!await _unitOfWork.Patients.AnyAsync(p => p.Id == request.PatientId))
            return NotFound(new { message = "Patient not found" });

        var note = new ClinicalNote
        {
            PatientId = request.PatientId,
            AppointmentId = request.AppointmentId,
            AuthoredByUserId = userId.Value,
            Subjective = request.Subjective,
            Objective = request.Objective,
            Assessment = request.Assessment,
            Plan = request.Plan,
            Status = ClinicalNoteStatus.Draft,
            IsLocked = false,
            CreatedDate = DateTime.UtcNow
        };

        await _unitOfWork.ClinicalNotes.AddAsync(note);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = note.Id }, new { note.Id });
    }

    /// <summary>Update a draft note (only allowed while Draft status).</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ClinicalNoteRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var note = await _unitOfWork.ClinicalNotes
            .Find(n => n.Id == id)
            .FirstOrDefaultAsync();

        if (note == null)
            return NotFound(new { message = "Clinical note not found" });

        if (note.IsLocked)
            return BadRequest(new { message = "Note is locked and cannot be edited. Create an amendment instead." });

        note.Subjective = request.Subjective;
        note.Objective = request.Objective;
        note.Assessment = request.Assessment;
        note.Plan = request.Plan;
        note.UpdatedDate = DateTime.UtcNow;

        _unitOfWork.ClinicalNotes.Update(note);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Note updated" });
    }

    /// <summary>Sign and lock a note — irreversible.</summary>
    [HttpPost("{id}/sign")]
    public async Task<IActionResult> Sign(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var note = await _unitOfWork.ClinicalNotes
            .Find(n => n.Id == id)
            .FirstOrDefaultAsync();

        if (note == null)
            return NotFound(new { message = "Clinical note not found" });

        if (note.AuthoredByUserId != userId.Value)
            return Forbid(); // Only the author can sign

        if (note.IsLocked)
            return BadRequest(new { message = "Note is already signed" });

        note.Status = ClinicalNoteStatus.Signed;
        note.IsLocked = true;
        note.SignedDate = DateTime.UtcNow;

        _unitOfWork.ClinicalNotes.Update(note);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Note signed and locked", signedDate = note.SignedDate });
    }

    /// <summary>Create an amendment (new note referencing the original signed note).</summary>
    [HttpPost("{id}/amend")]
    public async Task<IActionResult> Amend(int id, [FromBody] ClinicalNoteRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var original = await _unitOfWork.ClinicalNotes
            .Find(n => n.Id == id)
            .FirstOrDefaultAsync();

        if (original == null)
            return NotFound(new { message = "Original note not found" });

        if (!original.IsLocked)
            return BadRequest(new { message = "Can only amend a signed (locked) note" });

        // Update original status
        original.Status = ClinicalNoteStatus.Amended;
        _unitOfWork.ClinicalNotes.Update(original);

        var amendment = new ClinicalNote
        {
            PatientId = original.PatientId,
            AppointmentId = original.AppointmentId,
            AuthoredByUserId = userId.Value,
            Subjective = request.Subjective,
            Objective = request.Objective,
            Assessment = request.Assessment,
            Plan = request.Plan,
            Status = ClinicalNoteStatus.Draft,
            IsLocked = false,
            AmendedFromId = id,
            CreatedDate = DateTime.UtcNow
        };

        await _unitOfWork.ClinicalNotes.AddAsync(amendment);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = amendment.Id },
            new { amendment.Id, amendedFrom = id });
    }

    private static object MapToDto(ClinicalNote n) => new
    {
        n.Id,
        n.PatientId,
        n.AppointmentId,
        n.Subjective,
        n.Objective,
        n.Assessment,
        n.Plan,
        n.Status,
        statusName = n.Status.ToString(),
        n.IsLocked,
        n.SignedDate,
        n.AmendedFromId,
        n.CreatedDate,
        n.UpdatedDate,
        authoredBy = n.AuthoredByUser != null
            ? $"{n.AuthoredByUser.FirstName} {n.AuthoredByUser.LastName}" : null
    };
}

public record ClinicalNoteRequest(
    int PatientId,
    int? AppointmentId,
    string? Subjective,
    string? Objective,
    string? Assessment,
    string? Plan);
