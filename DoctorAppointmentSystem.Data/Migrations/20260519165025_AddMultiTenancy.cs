using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoctorAppointmentSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Treatments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "TreatmentPlans",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "TreatmentEstimates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Suppliers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "ScheduleBlocks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PurchaseOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Prescriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PerioExams",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Patients",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PatientRecalls",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PatientInsurances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PatientDocuments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "OdontogramFindings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Notifications",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "MedicalHistories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "LabOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Invoices",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "InventoryItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "InsuranceClaims",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "DentistSchedules",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "DentalRecords",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "ConsentForms",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "CommunicationLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "ClinicSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "ClinicalNotes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Branches",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "AuditLogs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "AppointmentWaitlists",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Appointments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ContactEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContactPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    City = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId",
                table: "Users",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Treatments_TenantId",
                table: "Treatments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlans_TenantId",
                table: "TreatmentPlans",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentEstimates_TenantId",
                table: "TreatmentEstimates",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_TenantId",
                table: "Suppliers",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduleBlocks_TenantId",
                table: "ScheduleBlocks",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_TenantId",
                table: "PurchaseOrders",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_TenantId",
                table: "Prescriptions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PerioExams_TenantId",
                table: "PerioExams",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_TenantId",
                table: "Patients",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientRecalls_TenantId",
                table: "PatientRecalls",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientInsurances_TenantId",
                table: "PatientInsurances",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDocuments_TenantId",
                table: "PatientDocuments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_OdontogramFindings_TenantId",
                table: "OdontogramFindings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_TenantId",
                table: "Notifications",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalHistories_TenantId",
                table: "MedicalHistories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_TenantId",
                table: "LabOrders",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_TenantId",
                table: "Invoices",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_TenantId",
                table: "InventoryItems",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceClaims_TenantId",
                table: "InsuranceClaims",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DentistSchedules_TenantId",
                table: "DentistSchedules",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DentalRecords_TenantId",
                table: "DentalRecords",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsentForms_TenantId",
                table: "ConsentForms",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_TenantId",
                table: "CommunicationLogs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicSettings_TenantId",
                table: "ClinicSettings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNotes_TenantId",
                table: "ClinicalNotes",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_TenantId",
                table: "Branches",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_TenantId",
                table: "AuditLogs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentWaitlists_TenantId",
                table: "AppointmentWaitlists",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_TenantId",
                table: "Appointments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_IsActive",
                table: "Tenants",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Slug",
                table: "Tenants",
                column: "Slug",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_Tenants_TenantId",
                table: "Appointments",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AppointmentWaitlists_Tenants_TenantId",
                table: "AppointmentWaitlists",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AuditLogs_Tenants_TenantId",
                table: "AuditLogs",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_Tenants_TenantId",
                table: "Branches",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ClinicalNotes_Tenants_TenantId",
                table: "ClinicalNotes",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ClinicSettings_Tenants_TenantId",
                table: "ClinicSettings",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CommunicationLogs_Tenants_TenantId",
                table: "CommunicationLogs",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ConsentForms_Tenants_TenantId",
                table: "ConsentForms",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DentalRecords_Tenants_TenantId",
                table: "DentalRecords",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DentistSchedules_Tenants_TenantId",
                table: "DentistSchedules",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InsuranceClaims_Tenants_TenantId",
                table: "InsuranceClaims",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Tenants_TenantId",
                table: "InventoryItems",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Tenants_TenantId",
                table: "Invoices",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LabOrders_Tenants_TenantId",
                table: "LabOrders",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MedicalHistories_Tenants_TenantId",
                table: "MedicalHistories",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Tenants_TenantId",
                table: "Notifications",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OdontogramFindings_Tenants_TenantId",
                table: "OdontogramFindings",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PatientDocuments_Tenants_TenantId",
                table: "PatientDocuments",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PatientInsurances_Tenants_TenantId",
                table: "PatientInsurances",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PatientRecalls_Tenants_TenantId",
                table: "PatientRecalls",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Tenants_TenantId",
                table: "Patients",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PerioExams_Tenants_TenantId",
                table: "PerioExams",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Prescriptions_Tenants_TenantId",
                table: "Prescriptions",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Tenants_TenantId",
                table: "PurchaseOrders",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduleBlocks_Tenants_TenantId",
                table: "ScheduleBlocks",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Suppliers_Tenants_TenantId",
                table: "Suppliers",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TreatmentEstimates_Tenants_TenantId",
                table: "TreatmentEstimates",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TreatmentPlans_Tenants_TenantId",
                table: "TreatmentPlans",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Treatments_Tenants_TenantId",
                table: "Treatments",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Tenants_TenantId",
                table: "Users",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_Tenants_TenantId",
                table: "Appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_AppointmentWaitlists_Tenants_TenantId",
                table: "AppointmentWaitlists");

            migrationBuilder.DropForeignKey(
                name: "FK_AuditLogs_Tenants_TenantId",
                table: "AuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_Branches_Tenants_TenantId",
                table: "Branches");

            migrationBuilder.DropForeignKey(
                name: "FK_ClinicalNotes_Tenants_TenantId",
                table: "ClinicalNotes");

            migrationBuilder.DropForeignKey(
                name: "FK_ClinicSettings_Tenants_TenantId",
                table: "ClinicSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunicationLogs_Tenants_TenantId",
                table: "CommunicationLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_ConsentForms_Tenants_TenantId",
                table: "ConsentForms");

            migrationBuilder.DropForeignKey(
                name: "FK_DentalRecords_Tenants_TenantId",
                table: "DentalRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_DentistSchedules_Tenants_TenantId",
                table: "DentistSchedules");

            migrationBuilder.DropForeignKey(
                name: "FK_InsuranceClaims_Tenants_TenantId",
                table: "InsuranceClaims");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Tenants_TenantId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Tenants_TenantId",
                table: "Invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_LabOrders_Tenants_TenantId",
                table: "LabOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_MedicalHistories_Tenants_TenantId",
                table: "MedicalHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Tenants_TenantId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_OdontogramFindings_Tenants_TenantId",
                table: "OdontogramFindings");

            migrationBuilder.DropForeignKey(
                name: "FK_PatientDocuments_Tenants_TenantId",
                table: "PatientDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_PatientInsurances_Tenants_TenantId",
                table: "PatientInsurances");

            migrationBuilder.DropForeignKey(
                name: "FK_PatientRecalls_Tenants_TenantId",
                table: "PatientRecalls");

            migrationBuilder.DropForeignKey(
                name: "FK_Patients_Tenants_TenantId",
                table: "Patients");

            migrationBuilder.DropForeignKey(
                name: "FK_PerioExams_Tenants_TenantId",
                table: "PerioExams");

            migrationBuilder.DropForeignKey(
                name: "FK_Prescriptions_Tenants_TenantId",
                table: "Prescriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Tenants_TenantId",
                table: "PurchaseOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduleBlocks_Tenants_TenantId",
                table: "ScheduleBlocks");

            migrationBuilder.DropForeignKey(
                name: "FK_Suppliers_Tenants_TenantId",
                table: "Suppliers");

            migrationBuilder.DropForeignKey(
                name: "FK_TreatmentEstimates_Tenants_TenantId",
                table: "TreatmentEstimates");

            migrationBuilder.DropForeignKey(
                name: "FK_TreatmentPlans_Tenants_TenantId",
                table: "TreatmentPlans");

            migrationBuilder.DropForeignKey(
                name: "FK_Treatments_Tenants_TenantId",
                table: "Treatments");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Tenants_TenantId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropIndex(
                name: "IX_Users_TenantId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Treatments_TenantId",
                table: "Treatments");

            migrationBuilder.DropIndex(
                name: "IX_TreatmentPlans_TenantId",
                table: "TreatmentPlans");

            migrationBuilder.DropIndex(
                name: "IX_TreatmentEstimates_TenantId",
                table: "TreatmentEstimates");

            migrationBuilder.DropIndex(
                name: "IX_Suppliers_TenantId",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_ScheduleBlocks_TenantId",
                table: "ScheduleBlocks");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_TenantId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Prescriptions_TenantId",
                table: "Prescriptions");

            migrationBuilder.DropIndex(
                name: "IX_PerioExams_TenantId",
                table: "PerioExams");

            migrationBuilder.DropIndex(
                name: "IX_Patients_TenantId",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_PatientRecalls_TenantId",
                table: "PatientRecalls");

            migrationBuilder.DropIndex(
                name: "IX_PatientInsurances_TenantId",
                table: "PatientInsurances");

            migrationBuilder.DropIndex(
                name: "IX_PatientDocuments_TenantId",
                table: "PatientDocuments");

            migrationBuilder.DropIndex(
                name: "IX_OdontogramFindings_TenantId",
                table: "OdontogramFindings");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_TenantId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_MedicalHistories_TenantId",
                table: "MedicalHistories");

            migrationBuilder.DropIndex(
                name: "IX_LabOrders_TenantId",
                table: "LabOrders");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_TenantId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_TenantId",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_InsuranceClaims_TenantId",
                table: "InsuranceClaims");

            migrationBuilder.DropIndex(
                name: "IX_DentistSchedules_TenantId",
                table: "DentistSchedules");

            migrationBuilder.DropIndex(
                name: "IX_DentalRecords_TenantId",
                table: "DentalRecords");

            migrationBuilder.DropIndex(
                name: "IX_ConsentForms_TenantId",
                table: "ConsentForms");

            migrationBuilder.DropIndex(
                name: "IX_CommunicationLogs_TenantId",
                table: "CommunicationLogs");

            migrationBuilder.DropIndex(
                name: "IX_ClinicSettings_TenantId",
                table: "ClinicSettings");

            migrationBuilder.DropIndex(
                name: "IX_ClinicalNotes_TenantId",
                table: "ClinicalNotes");

            migrationBuilder.DropIndex(
                name: "IX_Branches_TenantId",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_TenantId",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentWaitlists_TenantId",
                table: "AppointmentWaitlists");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_TenantId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Treatments");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "TreatmentPlans");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "TreatmentEstimates");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ScheduleBlocks");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PerioExams");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PatientRecalls");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PatientInsurances");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PatientDocuments");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "OdontogramFindings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "MedicalHistories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "InsuranceClaims");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "DentistSchedules");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "DentalRecords");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ConsentForms");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CommunicationLogs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ClinicSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ClinicalNotes");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AppointmentWaitlists");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Appointments");
        }
    }
}
