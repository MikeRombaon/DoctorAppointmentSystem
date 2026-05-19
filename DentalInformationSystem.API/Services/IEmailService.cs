namespace DentalInformationSystem.API.Services;

public interface IEmailService
{
    Task SendAppointmentReminderAsync(int appointmentId);
    Task SendInvoiceAsync(int invoiceId);
    Task SendPasswordResetAsync(string email, string resetToken);
    Task SendWelcomeEmailAsync(string email, string fullName);
    Task SendLowStockAlertAsync(List<string> itemNames);

    // Phase 6
    Task SendBatchRemindersAsync(DateTime targetDate, int daysAhead);
    Task SendCommunicationAsync(string recipient, string subject, string body, string type);
}
