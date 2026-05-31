using Microsoft.EntityFrameworkCore;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Domain.Entities;

namespace DoctorAppointmentSystem.Data;

public class ApplicationDbContext : DbContext
{
    private readonly TenantContext? _tenantContext;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options,
                                TenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    // Multi-Tenant
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<SubscriptionPaymentLog> SubscriptionPaymentLogs { get; set; }

    // Patient Management
    public DbSet<Patient> Patients { get; set; }
    public DbSet<DentalRecord> DentalRecords { get; set; }

    // User Management
    public DbSet<User> Users { get; set; }

    // Appointment & Treatment
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<TreatmentPlan> TreatmentPlans { get; set; }
    public DbSet<Treatment> Treatments { get; set; }
    public DbSet<TreatmentProcedure> TreatmentProcedures { get; set; }
    public DbSet<Procedure> Procedures { get; set; }

    // Inventory Management
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
    public DbSet<TreatmentInventoryUsage> TreatmentInventoryUsages { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }

    // Billing & Payment
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<InvoiceItem> InvoiceItems { get; set; }
    public DbSet<Payment> Payments { get; set; }

    // Phase 1 - Clinical Core
    public DbSet<OdontogramFinding> OdontogramFindings { get; set; }
    public DbSet<PerioExam> PerioExams { get; set; }
    public DbSet<PerioExamSite> PerioExamSites { get; set; }
    public DbSet<MedicalHistory> MedicalHistories { get; set; }
    public DbSet<ClinicalNote> ClinicalNotes { get; set; }
    public DbSet<ConsentForm> ConsentForms { get; set; }
    public DbSet<Prescription> Prescriptions { get; set; }
    public DbSet<PrescriptionItem> PrescriptionItems { get; set; }

    // Phase 2 - Financial
    public DbSet<InsurancePayer> InsurancePayers { get; set; }
    public DbSet<PatientInsurance> PatientInsurances { get; set; }
    public DbSet<TreatmentEstimate> TreatmentEstimates { get; set; }
    public DbSet<TreatmentEstimateItem> TreatmentEstimateItems { get; set; }
    public DbSet<InsuranceClaim> InsuranceClaims { get; set; }
    public DbSet<InvoiceAdjustment> InvoiceAdjustments { get; set; }

    // Phase 3 - Portal, Documents & Audit
    public DbSet<PatientDocument> PatientDocuments { get; set; }
    public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    // Phase 4 - Recall & Settings
    public DbSet<PatientRecall> PatientRecalls { get; set; }
    public DbSet<ClinicSettings> ClinicSettings { get; set; }

    // Phase 5 - Multi-Branch, Scheduling, Procurement, Lab, Waitlist
    public DbSet<Branch> Branches { get; set; }
    public DbSet<DentistSchedule> DentistSchedules { get; set; }
    public DbSet<ScheduleBlock> ScheduleBlocks { get; set; }
    public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
    public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
    public DbSet<LabOrder> LabOrders { get; set; }
    public DbSet<DiagnosticRequest> DiagnosticRequests { get; set; }
    public DbSet<AppointmentWaitlist> AppointmentWaitlists { get; set; }

    // Phase 6 - Notifications, Communication Log, Reminders
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<CommunicationLog> CommunicationLogs { get; set; }
    public DbSet<ReminderLog> ReminderLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Tenant Configuration ──────────────────────────────────────────────────
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(60);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.IsActive);
            entity.Property(e => e.SubscriptionPlan).HasMaxLength(50).HasDefaultValue("Trial");
            entity.Property(e => e.SubscriptionPrice).HasPrecision(18, 2).HasDefaultValue(100m);
            entity.Ignore(e => e.SubscriptionStatus); // computed, not persisted
        });

        // ── SubscriptionPaymentLog Configuration ──────────────────────────────────
        modelBuilder.Entity<SubscriptionPaymentLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Plan).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(10).HasDefaultValue("PHP");
            entity.Property(e => e.CardLast4).HasMaxLength(4);
            entity.Property(e => e.CardBrand).HasMaxLength(20);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.Property(e => e.TransactionReference).HasMaxLength(100);
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.TenantId);
        });

        // ── Global Tenant Query Filters ───────────────────────────────────────────
        // IMPORTANT: These filters are registered UNCONDITIONALLY so EF bakes them
        // into the compiled model at startup. The lambda body is evaluated per-query
        // against the live _tenantContext field of the current (scoped) DbContext
        // instance — not at model-build time. This is the correct EF Core pattern.
        //
        // Behaviour matrix:
        //   _tenantContext?.TenantId == null  →  no filter applied  (SuperAdmin / anonymous)
        //   _tenantContext?.TenantId == X     →  WHERE TenantId = X (tenant-scoped user)
        //
        // SuperAdmin cross-tenant access: leave TenantContext.TenantId null.
        // SuperAdmin scoped to one tenant : set TenantContext.TenantId via X-Tenant-Id header.

        modelBuilder.Entity<Patient>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<User>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault() || e.TenantId == null);

        modelBuilder.Entity<Branch>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<Appointment>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<Invoice>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<AuditLog>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault() || e.TenantId == null);

        modelBuilder.Entity<InventoryItem>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<Supplier>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<Prescription>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<LabOrder>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<ClinicalNote>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<MedicalHistory>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<TreatmentPlan>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<Treatment>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<DentalRecord>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<OdontogramFinding>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<PerioExam>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<ConsentForm>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<PatientDocument>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<PatientInsurance>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<InsuranceClaim>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<TreatmentEstimate>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<PatientRecall>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<AppointmentWaitlist>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<DentistSchedule>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<ScheduleBlock>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<Notification>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<CommunicationLog>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<ClinicSettings>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        modelBuilder.Entity<DiagnosticRequest>().HasQueryFilter(e =>
            _tenantContext == null || !_tenantContext.TenantId.HasValue ||
            e.TenantId == _tenantContext.TenantId.GetValueOrDefault());

        // ── Tenant FK Configurations ──
        // Entities with Tenant navigation property — use nav lambda so EF merges correctly
        modelBuilder.Entity<User>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<AuditLog>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Patient>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Branch>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Appointment>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);

        // Entities with TenantId only (no navigation property) — use type param form
        modelBuilder.Entity<InventoryItem>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Supplier>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Prescription>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LabOrder>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DiagnosticRequest>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ClinicalNote>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<MedicalHistory>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TreatmentPlan>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Treatment>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DentalRecord>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<OdontogramFinding>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PerioExam>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ConsentForm>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PatientDocument>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PatientInsurance>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InsuranceClaim>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TreatmentEstimate>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PatientRecall>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PurchaseOrder>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AppointmentWaitlist>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DentistSchedule>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ScheduleBlock>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Notification>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CommunicationLog>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ClinicSettings>().HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            
            // Indexes for performance
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => new { e.LastName, e.FirstName }); // Composite for sorting
            entity.HasIndex(e => e.PhoneNumber);
            entity.HasIndex(e => e.DateOfBirth);
            entity.HasIndex(e => e.CreatedDate);
        });

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            entity.HasIndex(e => e.Email).IsUnique();

            // Patient Portal relationship (one-to-one, optional)
            entity.HasOne(e => e.PatientProfile)
                .WithOne(p => p.User)
                .HasForeignKey<Patient>(p => p.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Appointment Configuration
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Appointments)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Dentist)
                .WithMany(u => u.Appointments)
                .HasForeignKey(e => e.DentistId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes for performance
            entity.HasIndex(e => e.AppointmentDate);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.AppointmentDate, e.Status }); // Composite for filtering today's appointments
            entity.HasIndex(e => new { e.PatientId, e.AppointmentDate }); // Patient appointment history
            entity.HasIndex(e => new { e.DentistId, e.AppointmentDate }); // Dentist schedule
            entity.HasIndex(e => e.CreatedDate);
        });

        // TreatmentPlan Configuration
        modelBuilder.Entity<TreatmentPlan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.TreatmentPlans)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes for performance
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.PatientId, e.Status }); // Patient active plans
            entity.HasIndex(e => e.CreatedDate);
        });

        // Treatment Configuration
        modelBuilder.Entity<Treatment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Cost).HasPrecision(18, 2);

            entity.HasOne(e => e.Appointment)
                .WithMany(a => a.Treatments)
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TreatmentPlan)
                .WithMany(tp => tp.Treatments)
                .HasForeignKey(e => e.TreatmentPlanId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Procedure)
                .WithMany(p => p.Treatments)
                .HasForeignKey(e => e.ProcedureId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes for performance
            entity.HasIndex(e => e.AppointmentId);
            entity.HasIndex(e => e.TreatmentPlanId);
            entity.HasIndex(e => e.ProcedureId);
            entity.HasIndex(e => e.DentistId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TreatmentDate);
            entity.HasIndex(e => new { e.TreatmentDate, e.Status }); // Treatment statistics
            entity.HasIndex(e => e.ToothPosition); // Dental records filtering
        });

        // Procedure Configuration
        modelBuilder.Entity<Procedure>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DefaultCost).HasPrecision(18, 2);
            
            // Indexes for performance
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.Name); // Search by name
        });

        // DentalRecord Configuration
        modelBuilder.Entity<DentalRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.Patient)
                .WithMany(p => p.DentalRecords)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Indexes for performance
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.ToothPosition);
            entity.HasIndex(e => e.IsResolved);
            entity.HasIndex(e => new { e.PatientId, e.ToothPosition }); // Dental chart queries
            entity.HasIndex(e => new { e.PatientId, e.IsResolved }); // Unresolved issues
            entity.HasIndex(e => e.RecordDate);
        });

        // InventoryItem Configuration
        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.SKU).IsRequired().HasMaxLength(50);
            entity.Property(e => e.UnitCost).HasPrecision(18, 2);
            entity.Property(e => e.SellingPrice).HasPrecision(18, 2);
            entity.HasIndex(e => e.SKU).IsUnique();
        });

        // InventoryTransaction Configuration
        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitCost).HasPrecision(18, 2);
            entity.Property(e => e.TotalCost).HasPrecision(18, 2);

            entity.HasOne(e => e.InventoryItem)
                .WithMany(i => i.Transactions)
                .HasForeignKey(e => e.InventoryItemId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes for performance
            entity.HasIndex(e => e.InventoryItemId);
            entity.HasIndex(e => e.TransactionType);
            entity.HasIndex(e => e.TransactionDate);
            entity.HasIndex(e => new { e.InventoryItemId, e.TransactionDate }); // Item history
            entity.HasIndex(e => new { e.TransactionDate, e.TransactionType }); // Transaction reports
        });

        // TreatmentInventoryUsage Configuration
        modelBuilder.Entity<TreatmentInventoryUsage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitCost).HasPrecision(18, 2);
            entity.Property(e => e.TotalCost).HasPrecision(18, 2);

            entity.HasOne(e => e.Treatment)
                .WithMany(t => t.InventoryUsages)
                .HasForeignKey(e => e.TreatmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.InventoryItem)
                .WithMany(i => i.TreatmentUsages)
                .HasForeignKey(e => e.InventoryItemId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes for performance
            entity.HasIndex(e => e.TreatmentId);
            entity.HasIndex(e => e.InventoryItemId);
            entity.HasIndex(e => e.UsageDate);
        });

        // Supplier Configuration
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            
            // Indexes for performance
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.Email);
        });

        // Invoice Configuration
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.SubTotal).HasPrecision(18, 2);
            entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
            entity.Property(e => e.Discount).HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
            entity.Property(e => e.PaidAmount).HasPrecision(18, 2);
            entity.Property(e => e.BalanceAmount).HasPrecision(18, 2);
            entity.HasIndex(e => e.InvoiceNumber).IsUnique();

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Invoices)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // InvoiceItem Configuration
        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.Discount).HasPrecision(18, 2);
            entity.Property(e => e.TotalPrice).HasPrecision(18, 2);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.InvoiceItems)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Indexes for performance
            entity.HasIndex(e => e.InvoiceId);
            entity.HasIndex(e => e.TreatmentId);
        });

        // Payment Configuration
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.TransactionNumber).IsRequired().HasMaxLength(100);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.Payments)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Phase 1: Clinical Core ────────────────────────────────────────────

        // OdontogramFinding Configuration
        modelBuilder.Entity<OdontogramFinding>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.OdontogramFindings)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.RecordedByUser)
                .WithMany()
                .HasForeignKey(e => e.RecordedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PatientId, e.ToothFdi, e.IsActive });
            entity.HasIndex(e => e.RecordedDate);
        });

        // PerioExam Configuration
        modelBuilder.Entity<PerioExam>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClinicalNotes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.PerioExams)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ExaminedByUser)
                .WithMany()
                .HasForeignKey(e => e.ExaminedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PatientId, e.ExamDate });
        });

        // PerioExamSite Configuration
        modelBuilder.Entity<PerioExamSite>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Site).IsRequired().HasMaxLength(3);
            entity.Ignore(e => e.CAL); // Computed property — not mapped

            entity.HasOne(e => e.PerioExam)
                .WithMany(pe => pe.Sites)
                .HasForeignKey(e => e.PerioExamId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.PerioExamId, e.ToothFdi, e.Site }).IsUnique();
        });

        // MedicalHistory Configuration
        modelBuilder.Entity<MedicalHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BloodPressure).HasMaxLength(20);
            entity.Property(e => e.Weight).HasPrecision(6, 2);
            entity.Property(e => e.Height).HasPrecision(6, 2);
            entity.Property(e => e.Temperature).HasPrecision(5, 2);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.MedicalHistories)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RecordedByUser)
                .WithMany()
                .HasForeignKey(e => e.RecordedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PatientId, e.IsActive });
            entity.HasIndex(e => e.RecordedDate);
        });

        // ClinicalNote Configuration
        modelBuilder.Entity<ClinicalNote>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.ClinicalNotes)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.AuthoredByUser)
                .WithMany()
                .HasForeignKey(e => e.AuthoredByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AmendedFrom)
                .WithMany()
                .HasForeignKey(e => e.AmendedFromId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PatientId, e.CreatedDate });
            entity.HasIndex(e => e.Status);
        });

        // ConsentForm Configuration
        modelBuilder.Entity<ConsentForm>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TemplateTitle).IsRequired().HasMaxLength(200);
            entity.Property(e => e.SignedByName).HasMaxLength(200);
            entity.Property(e => e.SignedByRelationship).HasMaxLength(100);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.ConsentForms)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.RequestedByUser)
                .WithMany()
                .HasForeignKey(e => e.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PatientId, e.Status });
            entity.HasIndex(e => e.CreatedDate);
        });

        // Prescription Configuration
        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DrugName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Strength).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DosageForm).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Dosage).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Frequency).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Duration).IsRequired().HasMaxLength(100);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Prescriptions)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.PrescribedByUser)
                .WithMany()
                .HasForeignKey(e => e.PrescribedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.PatientId, e.PrescriptionDate });
            entity.HasIndex(e => e.IsVoided);
        });

        // PrescriptionItem Configuration
        modelBuilder.Entity<PrescriptionItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DrugName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Strength).HasMaxLength(50);
            entity.Property(e => e.DosageForm).HasMaxLength(50);
            entity.Property(e => e.Dosage).HasMaxLength(100);
            entity.Property(e => e.Frequency).HasMaxLength(50);
            entity.Property(e => e.Duration).HasMaxLength(100);
            entity.HasOne(e => e.Prescription)
                .WithMany(p => p.Items)
                .HasForeignKey(e => e.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.PrescriptionId);
        });

        // Phase 2 - InsurancePayer Configuration
        modelBuilder.Entity<InsurancePayer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.PayerCode).HasMaxLength(50);
            entity.Property(e => e.ContactName).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.HasIndex(e => e.IsActive);
        });

        // Phase 2 - PatientInsurance Configuration
        modelBuilder.Entity<PatientInsurance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MemberNumber).IsRequired().HasMaxLength(100);
            entity.Property(e => e.GroupNumber).HasMaxLength(100);
            entity.Property(e => e.PlanName).HasMaxLength(200);
            entity.Property(e => e.AnnualMaximum).HasPrecision(18, 2);
            entity.Property(e => e.Deductible).HasPrecision(18, 2);
            entity.Property(e => e.DeductibleMet).HasPrecision(18, 2);
            entity.Property(e => e.AnnualUsed).HasPrecision(18, 2);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.PatientInsurances)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.InsurancePayer)
                .WithMany(p => p.PatientInsurances)
                .HasForeignKey(e => e.InsurancePayerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PatientId, e.IsActive });
        });

        // Phase 2 - TreatmentEstimate Configuration
        modelBuilder.Entity<TreatmentEstimate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EstimateNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.TotalFee).HasPrecision(18, 2);
            entity.Property(e => e.InsuranceEstimate).HasPrecision(18, 2);
            entity.Property(e => e.PatientPortion).HasPrecision(18, 2);
            entity.Property(e => e.Discount).HasPrecision(18, 2);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.TreatmentEstimates)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TreatmentPlan)
                .WithMany()
                .HasForeignKey(e => e.TreatmentPlanId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.EstimateNumber).IsUnique();
            entity.HasIndex(e => new { e.PatientId, e.Status });
        });

        // Phase 2 - TreatmentEstimateItem Configuration
        modelBuilder.Entity<TreatmentEstimateItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Fee).HasPrecision(18, 2);
            entity.Property(e => e.InsuranceEstimate).HasPrecision(18, 2);
            entity.Property(e => e.PatientPortion).HasPrecision(18, 2);

            entity.HasOne(e => e.Estimate)
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.TreatmentEstimateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Procedure)
                .WithMany()
                .HasForeignKey(e => e.ProcedureId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 2 - InsuranceClaim Configuration
        modelBuilder.Entity<InsuranceClaim>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClaimNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.BilledAmount).HasPrecision(18, 2);
            entity.Property(e => e.AllowedAmount).HasPrecision(18, 2);
            entity.Property(e => e.PaidAmount).HasPrecision(18, 2);
            entity.Property(e => e.AdjustmentAmount).HasPrecision(18, 2);
            entity.Property(e => e.PatientResponsibility).HasPrecision(18, 2);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.InsuranceClaims)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.Claims)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.InsurancePayer)
                .WithMany(p => p.Claims)
                .HasForeignKey(e => e.InsurancePayerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.PatientInsurance)
                .WithMany()
                .HasForeignKey(e => e.PatientInsuranceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ClaimNumber).IsUnique();
            entity.HasIndex(e => new { e.PatientId, e.Status });
        });

        // Phase 2 - InvoiceAdjustment Configuration
        modelBuilder.Entity<InvoiceAdjustment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.Adjustments)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.InvoiceId);
        });

        // Phase 3 - PatientDocument Configuration
        modelBuilder.Entity<PatientDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.StoredFileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Documents)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UploadedByUser)
                .WithMany()
                .HasForeignKey(e => e.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.PatientId, e.IsActive });
            entity.HasIndex(e => e.Category);
        });

        // Phase 3 - NotificationTemplate Configuration
        modelBuilder.Entity<NotificationTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Subject).IsRequired().HasMaxLength(300);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Phase 3 - AuditLog Configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityId).HasMaxLength(50);
            entity.Property(e => e.UserName).HasMaxLength(150);
            entity.Property(e => e.UserRole).HasMaxLength(50);
            entity.Property(e => e.IpAddress).HasMaxLength(45);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.HasIndex(e => e.UserId);
        });

        // Phase 4 - PatientRecall Configuration
        modelBuilder.Entity<PatientRecall>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Recalls)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CompletedAppointment)
                .WithMany()
                .HasForeignKey(e => e.CompletedAppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.PatientId, e.IsCompleted });
            entity.HasIndex(e => e.DueDate);
        });

        // Phase 4 - ClinicSettings Configuration (singleton per tenant)
        modelBuilder.Entity<ClinicSettings>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClinicName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.CurrencySymbol).HasMaxLength(10);
            entity.Property(e => e.TimeZone).HasMaxLength(80);
            entity.Property(e => e.WorkingHoursJson).HasColumnType("nvarchar(max)");
        });

        // Phase 5 - Branch
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // Phase 5 - Branch FK on Appointment
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasOne(e => e.Branch)
                .WithMany(b => b.Appointments)
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Phase 5 - Branch FK on User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasOne(e => e.Branch)
                .WithMany(b => b.Staff)
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Phase 5 - DentistSchedule
        modelBuilder.Entity<DentistSchedule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Dentist)
                .WithMany(u => u.DentistSchedules)
                .HasForeignKey(e => e.DentistId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Branch)
                .WithMany(b => b.DentistSchedules)
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.DentistId, e.DayOfWeek, e.BranchId });
        });

        // Phase 5 - ScheduleBlock
        modelBuilder.Entity<ScheduleBlock>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(200);
            entity.HasOne(e => e.Dentist)
                .WithMany(u => u.ScheduleBlocks)
                .HasForeignKey(e => e.DentistId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Branch)
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.DentistId, e.BlockDate });
        });

        // Phase 5 - PurchaseOrder
        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PONumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.PONumber).IsUnique();
            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Branch)
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 - PurchaseOrderItem
        modelBuilder.Entity<PurchaseOrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitCost).HasColumnType("decimal(18,2)");
            entity.Ignore(e => e.TotalCost);   // computed property
            entity.HasOne(e => e.PurchaseOrder)
                .WithMany(po => po.Items)
                .HasForeignKey(e => e.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.InventoryItem)
                .WithMany()
                .HasForeignKey(e => e.InventoryItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 - LabOrder
        modelBuilder.Entity<LabOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.LabName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.WorkType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EstimatedCost).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ActualCost).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasOne(e => e.Patient)
                .WithMany(p => p.LabOrders)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Treatment)
                .WithMany()
                .HasForeignKey(e => e.TreatmentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.OrderedByDentist)
                .WithMany()
                .HasForeignKey(e => e.OrderedByDentistId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Branch)
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.PatientId, e.Status });
        });

        // Phase 5 - DiagnosticRequest
        modelBuilder.Entity<DiagnosticRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RequestNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.TestType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.TestName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Urgency).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.RequestNumber).IsUnique();
            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.OrderedByDoctor)
                .WithMany()
                .HasForeignKey(e => e.OrderedByDoctorId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.PatientId, e.Status });
        });

        // Phase 5 - AppointmentWaitlist
        modelBuilder.Entity<AppointmentWaitlist>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Patient)
                .WithMany(p => p.WaitlistEntries)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.PreferredDentist)
                .WithMany()
                .HasForeignKey(e => e.PreferredDentistId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Branch)
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ScheduledAppointment)
                .WithMany()
                .HasForeignKey(e => e.ScheduledAppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.IsScheduled, e.RequestedDate });
        });

        // Phase 6 - Notification
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.Type).HasMaxLength(20);
            entity.Property(e => e.EntityType).HasMaxLength(100);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
            entity.HasIndex(e => e.CreatedDate);
        });

        // Phase 6 - CommunicationLog
        modelBuilder.Entity<CommunicationLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Channel).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Recipient).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Subject).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.Property(e => e.RelatedEntityType).HasMaxLength(100);
            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.SentByUser)
                .WithMany()
                .HasForeignKey(e => e.SentByUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.SentDate);
            entity.HasIndex(e => e.Type);
        });

        // TreatmentProcedure (join table for multi-procedure treatments)
        modelBuilder.Entity<TreatmentProcedure>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Treatment)
                .WithMany(t => t.TreatmentProcedures)
                .HasForeignKey(e => e.TreatmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Procedure)
                .WithMany()
                .HasForeignKey(e => e.ProcedureId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TreatmentId, e.ProcedureId }).IsUnique();
        });

        // Phase 6 - ReminderLog
        modelBuilder.Entity<ReminderLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasMaxLength(30);
            entity.HasOne(e => e.TriggeredByUser)
                .WithMany()
                .HasForeignKey(e => e.TriggeredByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.ReminderDate);
        });
    }
}
