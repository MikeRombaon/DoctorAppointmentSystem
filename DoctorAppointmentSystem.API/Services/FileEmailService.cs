using DoctorAppointmentSystem.Repositories.Interfaces;

namespace DoctorAppointmentSystem.API.Services;

/// <summary>
/// File-based email service for local deployment.
/// Writes emails to files instead of sending via SMTP.
/// Perfect for laptops/local machines where SMTP might not be available.
/// </summary>
public class FileEmailService : IEmailService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<FileEmailService> _logger;
    private readonly string _emailsPath;

    public FileEmailService(IUnitOfWork unitOfWork, ILogger<FileEmailService> logger, IWebHostEnvironment env)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
        _emailsPath = Path.Combine(env.ContentRootPath, "Emails");
        
        // Create emails directory if it doesn't exist
        if (!Directory.Exists(_emailsPath))
        {
            Directory.CreateDirectory(_emailsPath);
        }
    }

    public async Task SendAppointmentReminderAsync(int appointmentId)
    {
        try
        {
            var appointment = await _unitOfWork.Appointments.GetByIdAsync(appointmentId);
            if (appointment == null) return;

            var patient = await _unitOfWork.Patients.GetByIdAsync(appointment.PatientId);
            var doctor = await _unitOfWork.Users.GetByIdAsync(appointment.DentistId);

            var subject = "Appointment Reminder";
            var body = $@"
                <h2>Appointment Reminder</h2>
                <p>Dear {patient?.FullName},</p>
                <p>This is a reminder for your upcoming appointment:</p>
                <ul>
                    <li>Date: {appointment.AppointmentDate:MMMM dd, yyyy}</li>
                    <li>Time: {appointment.StartTime:hh:mm tt}</li>
                    <li>Doctor: Dr. {doctor?.FullName}</li>
                    <li>Purpose: {appointment.Purpose}</li>
                </ul>
                <p>Please arrive 10 minutes early.</p>
            ";

            await WriteEmailToFileAsync(patient?.Email ?? "unknown@email.com", subject, body);
            _logger.LogInformation("Appointment reminder email written for appointment {AppointmentId}", appointmentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending appointment reminder for {AppointmentId}", appointmentId);
        }
    }

    public async Task SendInvoiceAsync(int invoiceId)
    {
        try
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(invoiceId);
            if (invoice == null) return;

            var patient = await _unitOfWork.Patients.GetByIdAsync(invoice.PatientId);

            var subject = $"Invoice #{invoice.Id}";
            var body = $@"
                <h2>Invoice</h2>
                <p>Dear {patient?.FullName},</p>
                <p>Please find your invoice details below:</p>
                <ul>
                    <li>Invoice Number: {invoice.Id}</li>
                    <li>Date: {invoice.InvoiceDate:MMMM dd, yyyy}</li>
                    <li>Total Amount: ${invoice.TotalAmount:F2}</li>
                    <li>Paid Amount: ${invoice.PaidAmount:F2}</li>
                    <li>Balance Due: ${invoice.BalanceAmount:F2}</li>
                    <li>Status: {invoice.Status}</li>
                </ul>
                <p>Thank you for choosing our dental clinic.</p>
            ";

            await WriteEmailToFileAsync(patient?.Email ?? "unknown@email.com", subject, body);
            _logger.LogInformation("Invoice email written for invoice {InvoiceId}", invoiceId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending invoice email for {InvoiceId}", invoiceId);
        }
    }

    public Task SendPasswordResetAsync(string email, string resetToken)
    {
        var subject = "Password Reset Request";
        var body = $@"
            <h2>Password Reset</h2>
            <p>You requested a password reset.</p>
            <p>Your reset token: <strong>{resetToken}</strong></p>
            <p>This token will expire in 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
        ";

        return WriteEmailToFileAsync(email, subject, body);
    }

    public Task SendWelcomeEmailAsync(string email, string fullName)
    {
        var subject = "Welcome to Dental Clinic";
        var body = $@"
            <h2>Welcome!</h2>
            <p>Dear {fullName},</p>
            <p>Welcome to our dental clinic management system.</p>
            <p>Your account has been created successfully.</p>
            <p>You can now log in and start using the system.</p>
        ";

        return WriteEmailToFileAsync(email, subject, body);
    }

    public Task SendLowStockAlertAsync(List<string> itemNames)
    {
        var subject = "Low Stock Alert";
        var body = $@"
            <h2>Low Stock Alert</h2>
            <p>The following items are low on stock:</p>
            <ul>
                {string.Join("", itemNames.Select(i => $"<li>{i}</li>"))}
            </ul>
            <p>Please reorder these items soon.</p>
        ";

        return WriteEmailToFileAsync("admin@dentalclinic.com", subject, body);
    }

    private async Task WriteEmailToFileAsync(string to, string subject, string body)
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var fileName = $"{timestamp}_{SanitizeFileName(subject)}.html";
        var filePath = Path.Combine(_emailsPath, fileName);

        var emailContent = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>{subject}</title>
    <style>
        body {{ font-family: Arial, sans-serif; padding: 20px; }}
        h2 {{ color: #2196F3; }}
        ul {{ background: #f5f5f5; padding: 20px; border-radius: 5px; }}
    </style>
</head>
<body>
    <div style='border: 1px solid #ddd; padding: 20px; max-width: 600px;'>
        <p><strong>To:</strong> {to}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>Date:</strong> {DateTime.Now:yyyy-MM-dd HH:mm:ss}</p>
        <hr>
        {body}
    </div>
</body>
</html>";

        await File.WriteAllTextAsync(filePath, emailContent);
        _logger.LogInformation("Email written to: {FilePath}", filePath);
    }

    private string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Join("_", fileName.Split(invalid, StringSplitOptions.RemoveEmptyEntries))
            .TrimEnd('.').Substring(0, Math.Min(50, fileName.Length));
    }

    public async Task SendBatchRemindersAsync(DateTime targetDate, int daysAhead)
    {
        try
        {
            var appointments = (await _unitOfWork.Appointments.FindAsync(
                a => a.AppointmentDate.Date == targetDate.Date &&
                     a.Status != Domain.Enums.AppointmentStatus.Cancelled))
                .ToList();

            foreach (var appt in appointments)
            {
                await SendAppointmentReminderAsync(appt.Id);
            }

            _logger.LogInformation("Batch reminders sent for {Date}: {Count} appointments", targetDate.Date, appointments.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending batch reminders for {Date}", targetDate.Date);
        }
    }

    public async Task SendCommunicationAsync(string recipient, string subject, string body, string type)
    {
        try
        {
            await WriteEmailToFileAsync(recipient, subject, body);
            _logger.LogInformation("Communication [{Type}] written to file for {Recipient}", type, recipient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending communication [{Type}] to {Recipient}", type, recipient);
        }
    }

    public async Task SendSubscriptionExpiryWarningAsync(string email, string clinicName, DateTime expiresAt, int daysLeft)
    {
        var subject = $"⚠️ Your subscription expires in {daysLeft} day(s) — {clinicName}";
        var body = $@"
            <h2>Subscription Expiry Notice</h2>
            <p>Dear {clinicName} Administrator,</p>
            <p>This is a friendly reminder that your subscription will expire in <strong>{daysLeft} day(s)</strong>
               on <strong>{expiresAt:MMMM dd, yyyy}</strong>.</p>
            <p>After expiry, your team will no longer be able to log in until the subscription is renewed.</p>
            <p>Subscription rate: <strong>$100 USD / month</strong></p>
            <p>Please contact support or your account manager to renew your subscription before it lapses.</p>
            <br/>
            <p>Thank you,<br/>Doctor Appointment System Team</p>";
        await WriteEmailToFileAsync(email, subject, body);
        _logger.LogInformation("Subscription expiry warning written for {Clinic} ({DaysLeft} days left)", clinicName, daysLeft);
    }

    public async Task SendSubscriptionExpiredAsync(string email, string clinicName)
    {
        var subject = $"🔴 Subscription expired — {clinicName}";
        var body = $@"
            <h2>Subscription Expired</h2>
            <p>Dear {clinicName} Administrator,</p>
            <p>Your subscription has <strong>expired</strong>. Your users are currently unable to log in.</p>
            <p>To restore access, please renew your subscription (<strong>$100 USD / month</strong>) by contacting
               support or your account manager.</p>
            <br/>
            <p>Thank you,<br/>Doctor Appointment System Team</p>";
        await WriteEmailToFileAsync(email, subject, body);
        _logger.LogInformation("Subscription expired notification written for {Clinic}", clinicName);
    }
}
