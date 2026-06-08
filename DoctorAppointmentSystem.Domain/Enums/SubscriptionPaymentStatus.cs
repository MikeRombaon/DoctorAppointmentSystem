namespace DoctorAppointmentSystem.Domain.Enums;

public enum SubscriptionPaymentStatus
{
    Pending,    // Submitted by tenant admin, awaiting SuperAdmin review
    Approved,   // SuperAdmin approved — subscription extended
    Rejected,   // SuperAdmin rejected — see RejectionNote
}
