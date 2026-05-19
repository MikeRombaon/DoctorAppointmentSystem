using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.API.Services;
using DentalInformationSystem.Domain.Entities;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DentalInformationSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public SettingsController(IUnitOfWork uow, IAuditService audit)
    {
        _uow = uow;
        _audit = audit;
    }

    // GET api/settings
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await GetOrCreateSettingsAsync();
        return Ok(settings);
    }

    // PUT api/settings
    [HttpPut]
    [Authorize(Policy = Policies.CanManageUsers)]
    public async Task<IActionResult> Update([FromBody] UpdateSettingsRequest req)
    {
        var settings = await GetOrCreateSettingsAsync();
        var old = $"{{\"ClinicName\":\"{settings.ClinicName}\"}}";

        settings.ClinicName = req.ClinicName;
        settings.Address = req.Address;
        settings.City = req.City;
        settings.State = req.State;
        settings.PostalCode = req.PostalCode;
        settings.Phone = req.Phone;
        settings.Email = req.Email;
        settings.Website = req.Website;
        settings.TaxId = req.TaxId;
        settings.DefaultAppointmentDurationMinutes = req.DefaultAppointmentDurationMinutes;
        settings.SlotIntervalMinutes = req.SlotIntervalMinutes;
        settings.ReminderDaysBeforeAppointment = req.ReminderDaysBeforeAppointment;
        settings.RecallIntervalMonths = req.RecallIntervalMonths;
        settings.CurrencySymbol = req.CurrencySymbol;
        settings.TimeZone = req.TimeZone;
        settings.WorkingHoursJson = req.WorkingHoursJson;
        settings.UpdatedDate = DateTime.UtcNow;

        _uow.ClinicSettings.Update(settings);
        await _uow.SaveChangesAsync();

        await _audit.LogAsync("Update", "ClinicSettings", "1",
            oldValues: old, newValues: $"{{\"ClinicName\":\"{settings.ClinicName}\"}}");

        return Ok(settings);
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private async Task<ClinicSettings> GetOrCreateSettingsAsync()
    {
        var settings = (await _uow.ClinicSettings.GetAllAsync()).FirstOrDefault();
        if (settings != null) return settings;

        // Seed default row
        settings = new ClinicSettings { Id = 1 };
        await _uow.ClinicSettings.AddAsync(settings);
        await _uow.SaveChangesAsync();
        return settings;
    }
}

public record UpdateSettingsRequest(
    string ClinicName,
    string? Address, string? City, string? State, string? PostalCode,
    string? Phone, string? Email, string? Website, string? TaxId,
    int DefaultAppointmentDurationMinutes, int SlotIntervalMinutes,
    int ReminderDaysBeforeAppointment, int RecallIntervalMonths,
    string CurrencySymbol, string TimeZone,
    string? WorkingHoursJson);
