using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;

namespace DoctorAppointmentSystem.API.Controllers;

[Authorize]
public class InsuranceController : BaseController
{
    private readonly IUnitOfWork _uow;

    public InsuranceController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    // ── Payers ──────────────────────────────────────────────────────────────

    [HttpGet("payers")]
    public async Task<IActionResult> GetPayers([FromQuery] bool activeOnly = true)
    {
        var payers = await _uow.InsurancePayers.GetAll()
            .Where(p => !activeOnly || p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.PayerCode,
                p.ContactName,
                p.Phone,
                p.Email,
                p.Website,
                p.IsActive,
                p.CreatedDate
            })
            .ToListAsync();

        return Ok(payers);
    }

    [HttpGet("payers/{id}")]
    public async Task<IActionResult> GetPayer(int id)
    {
        var payer = await _uow.InsurancePayers.GetAll()
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.PayerCode,
                p.ContactName,
                p.Phone,
                p.Email,
                p.Address,
                p.Website,
                p.Notes,
                p.IsActive,
                p.CreatedDate
            })
            .FirstOrDefaultAsync();

        if (payer == null) return NotFound();
        return Ok(payer);
    }

    [HttpPost("payers")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> CreatePayer([FromBody] CreatePayerRequest req)
    {
        var payer = new InsurancePayer
        {
            Name = req.Name,
            PayerCode = req.PayerCode,
            ContactName = req.ContactName,
            Phone = req.Phone,
            Email = req.Email,
            Address = req.Address,
            Website = req.Website,
            Notes = req.Notes,
            IsActive = true
        };

        await _uow.InsurancePayers.AddAsync(payer);
        await _uow.SaveChangesAsync();
        return Ok(new { payer.Id, payer.Name });
    }

    [HttpPut("payers/{id}")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> UpdatePayer(int id, [FromBody] CreatePayerRequest req)
    {
        var payer = await _uow.InsurancePayers.GetByIdAsync(id);
        if (payer == null) return NotFound();

        payer.Name = req.Name;
        payer.PayerCode = req.PayerCode;
        payer.ContactName = req.ContactName;
        payer.Phone = req.Phone;
        payer.Email = req.Email;
        payer.Address = req.Address;
        payer.Website = req.Website;
        payer.Notes = req.Notes;

        _uow.InsurancePayers.Update(payer);
        await _uow.SaveChangesAsync();
        return Ok(new { payer.Id, payer.Name });
    }

    [HttpPatch("payers/{id}/toggle")]
    [Authorize(Policy = "CanManageUsers")]
    public async Task<IActionResult> TogglePayer(int id)
    {
        var payer = await _uow.InsurancePayers.GetByIdAsync(id);
        if (payer == null) return NotFound();

        payer.IsActive = !payer.IsActive;
        _uow.InsurancePayers.Update(payer);
        await _uow.SaveChangesAsync();
        return Ok(new { payer.Id, payer.IsActive });
    }

    // ── Patient Insurance ────────────────────────────────────────────────────

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetPatientInsurances(int patientId)
    {
        var records = await _uow.PatientInsurances.GetAll()
            .Include(pi => pi.InsurancePayer)
            .Where(pi => pi.PatientId == patientId)
            .OrderByDescending(pi => pi.IsPrimary)
            .ThenByDescending(pi => pi.CreatedDate)
            .Select(pi => new
            {
                pi.Id,
                pi.PatientId,
                pi.InsurancePayerId,
                PayerName = pi.InsurancePayer.Name,
                pi.MemberNumber,
                pi.GroupNumber,
                pi.PlanName,
                pi.EffectiveDate,
                pi.ExpirationDate,
                pi.AnnualMaximum,
                pi.Deductible,
                pi.DeductibleMet,
                pi.AnnualUsed,
                pi.CoveragePercentPreventive,
                pi.CoveragePercentBasic,
                pi.CoveragePercentMajor,
                pi.IsPrimary,
                pi.IsActive,
                pi.Notes,
                pi.CreatedDate
            })
            .ToListAsync();

        return Ok(records);
    }

    [HttpPost("patient")]
    public async Task<IActionResult> AddPatientInsurance([FromBody] CreatePatientInsuranceRequest req)
    {
        var pi = new PatientInsurance
        {
            PatientId = req.PatientId,
            InsurancePayerId = req.InsurancePayerId,
            MemberNumber = req.MemberNumber,
            GroupNumber = req.GroupNumber,
            PlanName = req.PlanName,
            EffectiveDate = req.EffectiveDate,
            ExpirationDate = req.ExpirationDate,
            AnnualMaximum = req.AnnualMaximum,
            Deductible = req.Deductible,
            DeductibleMet = req.DeductibleMet ?? 0,
            AnnualUsed = req.AnnualUsed ?? 0,
            CoveragePercentPreventive = req.CoveragePercentPreventive,
            CoveragePercentBasic = req.CoveragePercentBasic,
            CoveragePercentMajor = req.CoveragePercentMajor,
            IsPrimary = req.IsPrimary,
            Notes = req.Notes,
            IsActive = true
        };

        await _uow.PatientInsurances.AddAsync(pi);
        await _uow.SaveChangesAsync();
        return Ok(new { pi.Id });
    }

    [HttpPut("patient/{id}")]
    public async Task<IActionResult> UpdatePatientInsurance(int id, [FromBody] CreatePatientInsuranceRequest req)
    {
        var pi = await _uow.PatientInsurances.GetByIdAsync(id);
        if (pi == null) return NotFound();

        pi.InsurancePayerId = req.InsurancePayerId;
        pi.MemberNumber = req.MemberNumber;
        pi.GroupNumber = req.GroupNumber;
        pi.PlanName = req.PlanName;
        pi.EffectiveDate = req.EffectiveDate;
        pi.ExpirationDate = req.ExpirationDate;
        pi.AnnualMaximum = req.AnnualMaximum;
        pi.Deductible = req.Deductible;
        pi.DeductibleMet = req.DeductibleMet;
        pi.AnnualUsed = req.AnnualUsed;
        pi.CoveragePercentPreventive = req.CoveragePercentPreventive;
        pi.CoveragePercentBasic = req.CoveragePercentBasic;
        pi.CoveragePercentMajor = req.CoveragePercentMajor;
        pi.IsPrimary = req.IsPrimary;
        pi.Notes = req.Notes;

        _uow.PatientInsurances.Update(pi);
        await _uow.SaveChangesAsync();
        return Ok(new { pi.Id });
    }

    [HttpDelete("patient/{id}")]
    public async Task<IActionResult> DeletePatientInsurance(int id)
    {
        var pi = await _uow.PatientInsurances.GetByIdAsync(id);
        if (pi == null) return NotFound();

        _uow.PatientInsurances.Remove(pi);
        await _uow.SaveChangesAsync();
        return Ok();
    }
}

// ── Request Models ───────────────────────────────────────────────────────────

public record CreatePayerRequest(
    string Name,
    string? PayerCode,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? Website,
    string? Notes
);

public record CreatePatientInsuranceRequest(
    int PatientId,
    int InsurancePayerId,
    string MemberNumber,
    string? GroupNumber,
    string? PlanName,
    DateTime? EffectiveDate,
    DateTime? ExpirationDate,
    decimal? AnnualMaximum,
    decimal? Deductible,
    decimal? DeductibleMet,
    decimal? AnnualUsed,
    int? CoveragePercentPreventive,
    int? CoveragePercentBasic,
    int? CoveragePercentMajor,
    bool IsPrimary,
    string? Notes
);
