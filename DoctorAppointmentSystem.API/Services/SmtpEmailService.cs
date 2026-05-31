using DoctorAppointmentSystem.Repositories.Interfaces;
using System.Net;
using System.Net.Mail;

namespace DoctorAppointmentSystem.API.Services;

/// <summary>
/// SMTP-based email service. Activated when "Email:Provider" is "Smtp" in appsettings.
/// Falls back gracefully on failure and logs the error.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly IConfiguration _config;

    public SmtpEmailService(IUnitOfWork uow, ILogger<SmtpEmailService> logger, IConfiguration config)
    {
        _uow = uow;
        _logger = logger;
        _config = config;
    }

    private SmtpClient BuildClient()
    {
        var section = _config.GetSection("Email:Smtp");
        var client = new SmtpClient(section["Host"], int.Parse(section["Port"] ?? "587"))
        {
            EnableSsl = bool.Parse(section["EnableSsl"] ?? "true"),
            Credentials = new NetworkCredential(section["Username"], section["Password"])
        };
        return client;
    }

    private string FromAddress => _config["Email:Smtp:From"] ?? "noreply@dental.local";

    private async Task SendAsync(string to, string subject, string htmlBody)
    {
        try
        {
            using var client = BuildClient();
            var msg = new MailMessage(FromAddress, to, subject, htmlBody) { IsBodyHtml = true };
            await client.SendMailAsync(msg);
            _logger.LogInformation("Email sent to {To} — {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMTP send failed to {To} — {Subject}", to, subject);
        }
    }

    public async Task SendAppointmentReminderAsync(int appointmentId)
    {
        var appointment = await _uow.Appointments.GetByIdAsync(appointmentId);
        if (appointment == null) return;
        var patient = await _uow.Patients.GetByIdAsync(appointment.PatientId);
        var doctor = await _uow.Users.GetByIdAsync(appointment.DentistId);

        var subject = "Appointment Reminder";
        var body = $@"<h2>Appointment Reminder</h2>
<p>Dear {patient?.FullName},</p>
<p>You have an appointment on <strong>{appointment.AppointmentDate:MMMM dd, yyyy}</strong>
at <strong>{appointment.StartTime}</strong> with Dr. {doctor?.FullName}.</p>
<p>Purpose: {appointment.Purpose}</p>
<p>Please arrive 10 minutes early. Reply to this email if you need to reschedule.</p>";

        await SendAsync(patient?.Email ?? "", subject, body);
    }

    public async Task SendInvoiceAsync(int invoiceId)
    {
        var invoice = await _uow.Invoices.GetByIdAsync(invoiceId);
        if (invoice == null) return;
        var patient = await _uow.Patients.GetByIdAsync(invoice.PatientId);

        var subject = $"Your Invoice — {invoice.InvoiceNumber}";
        var body = $@"<h2>Invoice {invoice.InvoiceNumber}</h2>
<p>Dear {patient?.FullName},</p>
<p>Total: <strong>₱{invoice.TotalAmount:N2}</strong> &nbsp; Paid: ₱{invoice.PaidAmount:N2} &nbsp; Balance: ₱{invoice.BalanceAmount:N2}</p>
<p>Status: {invoice.Status}</p>
<p>Thank you for choosing our clinic.</p>";

        await SendAsync(patient?.Email ?? "", subject, body);
    }

    public Task SendPasswordResetAsync(string email, string resetToken)
    {
        var subject = "Password Reset";
        var body = $@"<h2>Password Reset</h2>
<p>Use the token below to reset your password. It expires in 1 hour.</p>
<p><strong>{resetToken}</strong></p>";
        return SendAsync(email, subject, body);
    }

    public Task SendWelcomeEmailAsync(string email, string fullName)
    {
        var subject = "Welcome to our Dental Clinic";
        var body = $@"<h2>Welcome, {fullName}!</h2>
<p>Your patient portal account has been created. You can now view your records, appointments, and invoices online.</p>";
        return SendAsync(email, subject, body);
    }

    public async Task SendLowStockAlertAsync(List<string> itemNames)
    {
        var adminEmails = (await _uow.Users.GetAllAsync())
            .Where(u => u.Role == Domain.Enums.UserRole.Admin && !string.IsNullOrEmpty(u.Email))
            .Select(u => u.Email!)
            .ToList();

        var subject = "Low Stock Alert";
        var list = string.Join("", itemNames.Select(n => $"<li>{n}</li>"));
        var body = $"<h2>Low Stock Alert</h2><ul>{list}</ul>";

        foreach (var email in adminEmails)
            await SendAsync(email, subject, body);
    }

    public async Task SendBatchRemindersAsync(DateTime targetDate, int daysAhead)
    {
        var appointments = (await _uow.Appointments.FindAsync(
            a => a.AppointmentDate.Date == targetDate.Date &&
                 a.Status != Domain.Enums.AppointmentStatus.Cancelled))
            .ToList();

        foreach (var appt in appointments)
            await SendAppointmentReminderAsync(appt.Id);

        _logger.LogInformation("Batch reminders sent for {Date}: {Count} appointments", targetDate.Date, appointments.Count);
    }

    public Task SendCommunicationAsync(string recipient, string subject, string body, string type)
    {
        return SendAsync(recipient, subject, body);
    }

    public Task SendSubscriptionExpiryWarningAsync(string email, string clinicName, DateTime expiresAt, int daysLeft)
    {
        var subject = $"⚠️ Your subscription expires in {daysLeft} day(s) — {clinicName}";
        var body = $@"<h2>Subscription Expiry Notice</h2>
            <p>Dear {clinicName} Administrator,</p>
            <p>Your subscription will expire in <strong>{daysLeft} day(s)</strong>
               on <strong>{expiresAt:MMMM dd, yyyy}</strong>.</p>
            <p>After expiry your team will no longer be able to log in until the subscription is renewed.</p>
            <p>Subscription rate: <strong>$100 USD / month</strong></p>
            <p>Please contact support to renew before it lapses.</p>
            <br/><p>Thank you,<br/>Doctor Appointment System Team</p>";
        return SendAsync(email, subject, body);
    }

    public Task SendSubscriptionExpiredAsync(string email, string clinicName)
    {
        var subject = $"🔴 Subscription expired — {clinicName}";
        var body = $@"<h2>Subscription Expired</h2>
            <p>Dear {clinicName} Administrator,</p>
            <p>Your subscription has <strong>expired</strong>. Your users are currently unable to log in.</p>
            <p>To restore access, please renew your subscription (<strong>$100 USD / month</strong>) by contacting support.</p>
            <br/><p>Thank you,<br/>Doctor Appointment System Team</p>";
        return SendAsync(email, subject, body);
    }
}
