using DoctorAppointmentSystem.Data;
using DoctorAppointmentSystem.Domain.Entities;
using DoctorAppointmentSystem.Repositories.Interfaces;

namespace DoctorAppointmentSystem.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
        
        // Initialize repositories
        Patients = new Repository<Patient>(_context);
        Users = new Repository<User>(_context);
        Appointments = new Repository<Appointment>(_context);
        TreatmentPlans = new Repository<TreatmentPlan>(_context);
        Treatments = new Repository<Treatment>(_context);
        TreatmentProcedures = new Repository<TreatmentProcedure>(_context);
        Procedures = new Repository<Procedure>(_context);
        DentalRecords = new Repository<DentalRecord>(_context);
        InventoryItems = new Repository<InventoryItem>(_context);
        InventoryTransactions = new Repository<InventoryTransaction>(_context);
        TreatmentInventoryUsages = new Repository<TreatmentInventoryUsage>(_context);
        Suppliers = new Repository<Supplier>(_context);
        Invoices = new Repository<Invoice>(_context);
        InvoiceItems = new Repository<InvoiceItem>(_context);
        Payments = new Repository<Payment>(_context);

        // Phase 1 - Clinical Core
        OdontogramFindings = new Repository<OdontogramFinding>(_context);
        PerioExams = new Repository<PerioExam>(_context);
        PerioExamSites = new Repository<PerioExamSite>(_context);
        MedicalHistories = new Repository<MedicalHistory>(_context);
        ClinicalNotes = new Repository<ClinicalNote>(_context);
        ConsentForms = new Repository<ConsentForm>(_context);
        Prescriptions = new Repository<Prescription>(_context);
        PrescriptionItems = new Repository<PrescriptionItem>(_context);

        // Phase 2 - Financial
        InsurancePayers = new Repository<InsurancePayer>(_context);
        PatientInsurances = new Repository<PatientInsurance>(_context);
        TreatmentEstimates = new Repository<TreatmentEstimate>(_context);
        TreatmentEstimateItems = new Repository<TreatmentEstimateItem>(_context);
        InsuranceClaims = new Repository<InsuranceClaim>(_context);
        InvoiceAdjustments = new Repository<InvoiceAdjustment>(_context);

        // Phase 3 - Portal, Documents & Audit
        PatientDocuments = new Repository<PatientDocument>(_context);
        NotificationTemplates = new Repository<NotificationTemplate>(_context);
        AuditLogs = new Repository<AuditLog>(_context);

        // Phase 4 - Recall & Settings
        PatientRecalls = new Repository<PatientRecall>(_context);
        ClinicSettings = new Repository<ClinicSettings>(_context);

        // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
        Branches = new Repository<Branch>(_context);
        DentistSchedules = new Repository<DentistSchedule>(_context);
        ScheduleBlocks = new Repository<ScheduleBlock>(_context);
        PurchaseOrders = new Repository<PurchaseOrder>(_context);
        PurchaseOrderItems = new Repository<PurchaseOrderItem>(_context);
        LabOrders = new Repository<LabOrder>(_context);
        DiagnosticRequests = new Repository<DiagnosticRequest>(_context);
        AppointmentWaitlists = new Repository<AppointmentWaitlist>(_context);

        // Phase 6 - Notifications, Communication Log, Reminders
        Notifications = new Repository<Notification>(_context);
        CommunicationLogs = new Repository<CommunicationLog>(_context);
        ReminderLogs = new Repository<ReminderLog>(_context);

        // General Medicine - Diagnosis & Vitals
        PatientDiagnoses = new Repository<PatientDiagnosis>(_context);
        PatientVitals = new Repository<PatientVitals>(_context);
    }

    // Patient Management
    public IRepository<Patient> Patients { get; private set; }
    public IRepository<DentalRecord> DentalRecords { get; private set; }

    // User Management
    public IRepository<User> Users { get; private set; }

    // Appointment & Treatment
    public IRepository<Appointment> Appointments { get; private set; }
    public IRepository<TreatmentPlan> TreatmentPlans { get; private set; }
    public IRepository<Treatment> Treatments { get; private set; }
    public IRepository<TreatmentProcedure> TreatmentProcedures { get; private set; }
    public IRepository<Procedure> Procedures { get; private set; }

    // Inventory Management
    public IRepository<InventoryItem> InventoryItems { get; private set; }
    public IRepository<InventoryTransaction> InventoryTransactions { get; private set; }
    public IRepository<TreatmentInventoryUsage> TreatmentInventoryUsages { get; private set; }
    public IRepository<Supplier> Suppliers { get; private set; }

    // Billing & Payment
    public IRepository<Invoice> Invoices { get; private set; }
    public IRepository<InvoiceItem> InvoiceItems { get; private set; }
    public IRepository<Payment> Payments { get; private set; }

    // Phase 1 - Clinical Core
    public IRepository<OdontogramFinding> OdontogramFindings { get; private set; }
    public IRepository<PerioExam> PerioExams { get; private set; }
    public IRepository<PerioExamSite> PerioExamSites { get; private set; }
    public IRepository<MedicalHistory> MedicalHistories { get; private set; }
    public IRepository<ClinicalNote> ClinicalNotes { get; private set; }
    public IRepository<ConsentForm> ConsentForms { get; private set; }
    public IRepository<Prescription> Prescriptions { get; private set; }
    public IRepository<PrescriptionItem> PrescriptionItems { get; private set; }

    // Phase 2 - Financial
    public IRepository<InsurancePayer> InsurancePayers { get; private set; }
    public IRepository<PatientInsurance> PatientInsurances { get; private set; }
    public IRepository<TreatmentEstimate> TreatmentEstimates { get; private set; }
    public IRepository<TreatmentEstimateItem> TreatmentEstimateItems { get; private set; }
    public IRepository<InsuranceClaim> InsuranceClaims { get; private set; }
    public IRepository<InvoiceAdjustment> InvoiceAdjustments { get; private set; }

    // Phase 3 - Portal, Documents & Audit
    public IRepository<PatientDocument> PatientDocuments { get; private set; }
    public IRepository<NotificationTemplate> NotificationTemplates { get; private set; }
    public IRepository<AuditLog> AuditLogs { get; private set; }

    // Phase 4 - Recall & Settings
    public IRepository<PatientRecall> PatientRecalls { get; private set; }
    public IRepository<ClinicSettings> ClinicSettings { get; private set; }

    // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
    public IRepository<Branch> Branches { get; private set; }
    public IRepository<DentistSchedule> DentistSchedules { get; private set; }
    public IRepository<ScheduleBlock> ScheduleBlocks { get; private set; }
    public IRepository<PurchaseOrder> PurchaseOrders { get; private set; }
    public IRepository<PurchaseOrderItem> PurchaseOrderItems { get; private set; }
    public IRepository<LabOrder> LabOrders { get; private set; }
    public IRepository<DiagnosticRequest> DiagnosticRequests { get; private set; }
    public IRepository<AppointmentWaitlist> AppointmentWaitlists { get; private set; }

    // Phase 6 - Notifications, Communication Log, Reminders
    public IRepository<Notification> Notifications { get; private set; }
    public IRepository<CommunicationLog> CommunicationLogs { get; private set; }
    public IRepository<ReminderLog> ReminderLogs { get; private set; }

    // General Medicine - Diagnosis & Vitals
    public IRepository<PatientDiagnosis> PatientDiagnoses { get; private set; }
    public IRepository<PatientVitals> PatientVitals { get; private set; }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public int SaveChanges()
    {
        return _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
