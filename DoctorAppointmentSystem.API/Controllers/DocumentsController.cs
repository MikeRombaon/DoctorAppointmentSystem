using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DoctorAppointmentSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<DocumentsController> _logger;
    private readonly TenantContext _tenantContext;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".dcm",
        ".doc", ".docx", ".xls", ".xlsx"
    };

    public DocumentsController(IUnitOfWork uow, IAuditService audit,
        IConfiguration config, IWebHostEnvironment env,
        ILogger<DocumentsController> logger, TenantContext tenantContext)
    {
        _uow = uow;
        _audit = audit;
        _config = config;
        _env = env;
        _logger = logger;
        _tenantContext = tenantContext;
    }

    private string GetUploadRoot() =>
        Path.Combine(_env.ContentRootPath,
            _config["Uploads:BasePath"] ?? "wwwroot/uploads");

    private long MaxFileSize =>
        long.TryParse(_config["Uploads:MaxFileSizeBytes"], out var v) ? v : 10_485_760;

    // GET api/documents/patient/{patientId}
    [HttpGet("patient/{patientId}")]
    [Authorize(Policy = "CanManagePatients")]
    public async Task<IActionResult> GetByPatient(int patientId, [FromQuery] string? category)
    {
        var docs = (await _uow.PatientDocuments.FindAsync(
            d => d.PatientId == patientId && d.IsActive))
            .OrderByDescending(d => d.UploadedDate)
            .ToList();

        if (!string.IsNullOrWhiteSpace(category))
            docs = docs.Where(d => d.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

        return Ok(docs.Select(d => new
        {
            d.Id, d.FileName, d.ContentType, d.FileSizeBytes,
            d.Category, d.Description, d.UploadedDate, d.AppointmentId
        }));
    }

    // GET api/documents/my   — patient portal (own documents)
    [HttpGet("my")]
    [Authorize(Policy = "CanViewOwnRecords")]
    public async Task<IActionResult> GetMyDocuments([FromQuery] string? category)
    {
        // Staff/Admin roles do not have a linked Patient record.
        // Return an empty list so the UI degrades gracefully instead of 403.
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role is "SuperAdmin" or "Admin" or "ClinicalStaff" or "SupportStaff")
            return Ok(Array.Empty<object>());

        var patientId = GetCurrentPatientId();
        if (patientId == null) return Forbid();
        return await GetByPatient(patientId.Value, category);
    }

    // POST api/documents/patient/{patientId}
    [HttpPost("patient/{patientId}")]
    [Authorize(Policy = "CanManagePatients")]
    public async Task<IActionResult> Upload(int patientId, IFormFile file,
        [FromForm] string category = "General", [FromForm] string? description = null,
        [FromForm] int? appointmentId = null)
    {
        if (file == null || file.Length == 0) return BadRequest("No file provided.");
        if (file.Length > MaxFileSize) return BadRequest($"File exceeds maximum size of {MaxFileSize / 1_048_576} MB.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext)) return BadRequest($"File type '{ext}' is not allowed.");

        var uploadRoot = GetUploadRoot();
        var patientFolder = Path.Combine(uploadRoot, $"patient_{patientId}");
        Directory.CreateDirectory(patientFolder);

        var storedName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(patientFolder, storedName);

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        var uploadedById = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var doc = new PatientDocument
        {
            PatientId = patientId,
            UploadedByUserId = uploadedById,
            AppointmentId = appointmentId,
            FileName = file.FileName,
            StoredFileName = storedName,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length,
            Category = category,
            Description = description,
            TenantId = _tenantContext.TenantId ?? 0
        };

        await _uow.PatientDocuments.AddAsync(doc);
        await _uow.SaveChangesAsync();

        await _audit.LogAsync("Upload", "PatientDocument", doc.Id.ToString(),
            newValues: $"{{\"FileName\":\"{file.FileName}\",\"Category\":\"{category}\"}}");

        return CreatedAtAction(nameof(GetById), new { id = doc.Id }, new
        {
            doc.Id, doc.FileName, doc.ContentType, doc.FileSizeBytes,
            doc.Category, doc.Description, doc.UploadedDate
        });
    }

    // GET api/documents/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var doc = await _uow.PatientDocuments.GetByIdAsync(id);
        if (doc == null || !doc.IsActive) return NotFound();

        if (!CanAccessDocument(doc)) return Forbid();

        return Ok(new
        {
            doc.Id, doc.FileName, doc.ContentType, doc.FileSizeBytes,
            doc.Category, doc.Description, doc.UploadedDate, doc.PatientId, doc.AppointmentId
        });
    }

    // GET api/documents/{id}/download
    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var doc = await _uow.PatientDocuments.GetByIdAsync(id);
        if (doc == null || !doc.IsActive) return NotFound();

        if (!CanAccessDocument(doc)) return Forbid();

        var path = Path.Combine(GetUploadRoot(), $"patient_{doc.PatientId}", doc.StoredFileName);
        if (!System.IO.File.Exists(path)) return NotFound("File not found on disk.");

        await _audit.LogAsync("Download", "PatientDocument", doc.Id.ToString());

        var bytes = await System.IO.File.ReadAllBytesAsync(path);
        return File(bytes, doc.ContentType, doc.FileName);
    }

    // DELETE api/documents/{id}
    [HttpDelete("{id}")]
    [Authorize(Policy = "CanManagePatients")]
    public async Task<IActionResult> Delete(int id)
    {
        var doc = await _uow.PatientDocuments.GetByIdAsync(id);
        if (doc == null || !doc.IsActive) return NotFound();

        doc.IsActive = false;
        _uow.PatientDocuments.Update(doc);
        await _uow.SaveChangesAsync();

        await _audit.LogAsync("Delete", "PatientDocument", doc.Id.ToString(),
            oldValues: $"{{\"FileName\":\"{doc.FileName}\"}}");

        return NoContent();
    }

    // ────────────────────────────────────────────
    private bool CanAccessDocument(PatientDocument doc)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role is "Admin" or "ClinicalStaff" or "SupportStaff") return true;

        // Patient can only access their own documents
        var patientId = GetCurrentPatientId();
        return patientId.HasValue && doc.PatientId == patientId.Value;
    }

    private int? GetCurrentPatientId()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid)) return null;
        var patient = _uow.Patients.FindAsync(p => p.UserId == uid).Result.FirstOrDefault();
        return patient?.Id;
    }
}
