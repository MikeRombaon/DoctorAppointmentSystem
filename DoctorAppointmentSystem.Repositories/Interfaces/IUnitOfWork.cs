using DoctorAppointmentSystem.Domain.Entities;

namespace DoctorAppointmentSystem.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    // Patient Management
    IRepository<Patient> Patients { get; }
    IRepository<DentalRecord> DentalRecords { get; }

    // User Management
    IRepository<User> Users { get; }

    // Appointment & Treatment
    IRepository<Appointment> Appointments { get; }
    IRepository<TreatmentPlan> TreatmentPlans { get; }
    IRepository<Treatment> Treatments { get; }
    IRepository<TreatmentProcedure> TreatmentProcedures { get; }
    IRepository<Procedure> Procedures { get; }

    // Inventory Management
    IRepository<InventoryItem> InventoryItems { get; }
    IRepository<InventoryTransaction> InventoryTransactions { get; }
    IRepository<TreatmentInventoryUsage> TreatmentInventoryUsages { get; }
    IRepository<Supplier> Suppliers { get; }

    // Billing & Payment
    IRepository<Invoice> Invoices { get; }
    IRepository<InvoiceItem> InvoiceItems { get; }
    IRepository<Payment> Payments { get; }

    // Phase 1 - Clinical Core
    IRepository<OdontogramFinding> OdontogramFindings { get; }
    IRepository<PerioExam> PerioExams { get; }
    IRepository<PerioExamSite> PerioExamSites { get; }
    IRepository<MedicalHistory> MedicalHistories { get; }
    IRepository<ClinicalNote> ClinicalNotes { get; }
    IRepository<ConsentForm> ConsentForms { get; }
    IRepository<Prescription> Prescriptions { get; }
    IRepository<PrescriptionItem> PrescriptionItems { get; }

    // Phase 2 - Financial
    IRepository<InsurancePayer> InsurancePayers { get; }
    IRepository<PatientInsurance> PatientInsurances { get; }
    IRepository<TreatmentEstimate> TreatmentEstimates { get; }
    IRepository<TreatmentEstimateItem> TreatmentEstimateItems { get; }
    IRepository<InsuranceClaim> InsuranceClaims { get; }
    IRepository<InvoiceAdjustment> InvoiceAdjustments { get; }

    // Phase 3 - Portal, Documents & Audit
    IRepository<PatientDocument> PatientDocuments { get; }
    IRepository<NotificationTemplate> NotificationTemplates { get; }
    IRepository<AuditLog> AuditLogs { get; }

    // Phase 4 - Recall & Settings
    IRepository<PatientRecall> PatientRecalls { get; }
    IRepository<ClinicSettings> ClinicSettings { get; }

    // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
    IRepository<Branch> Branches { get; }
    IRepository<DentistSchedule> DentistSchedules { get; }
    IRepository<ScheduleBlock> ScheduleBlocks { get; }
    IRepository<PurchaseOrder> PurchaseOrders { get; }
    IRepository<PurchaseOrderItem> PurchaseOrderItems { get; }
    IRepository<LabOrder> LabOrders { get; }
    IRepository<DiagnosticRequest> DiagnosticRequests { get; }
    IRepository<AppointmentWaitlist> AppointmentWaitlists { get; }

    // Phase 6 - Notifications, Communication Log, Reminders
    IRepository<Notification> Notifications { get; }
    IRepository<CommunicationLog> CommunicationLogs { get; }
    IRepository<ReminderLog> ReminderLogs { get; }

    // General Medicine - Diagnosis & Vitals
    IRepository<PatientDiagnosis> PatientDiagnoses { get; }
    IRepository<PatientVitals> PatientVitals { get; }

    Task<int> SaveChangesAsync();
    int SaveChanges();
}
