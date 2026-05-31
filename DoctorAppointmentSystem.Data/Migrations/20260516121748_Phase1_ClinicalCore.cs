using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoctorAppointmentSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase1_ClinicalCore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClinicalNotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    AuthoredByUserId = table.Column<int>(type: "int", nullable: false),
                    Subjective = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Objective = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Assessment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Plan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsLocked = table.Column<bool>(type: "bit", nullable: false),
                    SignedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AmendedFromId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalNotes_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClinicalNotes_ClinicalNotes_AmendedFromId",
                        column: x => x.AmendedFromId,
                        principalTable: "ClinicalNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicalNotes_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicalNotes_Users_AuthoredByUserId",
                        column: x => x.AuthoredByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConsentForms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    TemplateTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ConsentText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PatientSignatureData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SignedByRelationship = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SignedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsentForms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsentForms_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ConsentForms_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ConsentForms_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MedicalHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    HasHeartDisease = table.Column<bool>(type: "bit", nullable: false),
                    HasDiabetes = table.Column<bool>(type: "bit", nullable: false),
                    HasHypertension = table.Column<bool>(type: "bit", nullable: false),
                    HasAsthma = table.Column<bool>(type: "bit", nullable: false),
                    HasBleedingDisorder = table.Column<bool>(type: "bit", nullable: false),
                    HasEpilepsy = table.Column<bool>(type: "bit", nullable: false),
                    HasHIV = table.Column<bool>(type: "bit", nullable: false),
                    HasHepatitis = table.Column<bool>(type: "bit", nullable: false),
                    HasOsteoporosis = table.Column<bool>(type: "bit", nullable: false),
                    IsPregnant = table.Column<bool>(type: "bit", nullable: false),
                    OtherConditions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AllergyToPenicillin = table.Column<bool>(type: "bit", nullable: false),
                    AllergyToAspirin = table.Column<bool>(type: "bit", nullable: false),
                    AllergyToLatex = table.Column<bool>(type: "bit", nullable: false),
                    AllergyToAnesthesia = table.Column<bool>(type: "bit", nullable: false),
                    OtherAllergies = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentMedications = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BloodPressure = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PulseRate = table.Column<int>(type: "int", nullable: true),
                    Temperature = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    Weight = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    Height = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    HasAnxiety = table.Column<bool>(type: "bit", nullable: false),
                    HasBadExperience = table.Column<bool>(type: "bit", nullable: false),
                    HasBruxism = table.Column<bool>(type: "bit", nullable: false),
                    PreviousDentalWork = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChiefComplaint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsSmoker = table.Column<bool>(type: "bit", nullable: false),
                    ConsumesAlcohol = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RecordedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecordedByUserId = table.Column<int>(type: "int", nullable: false),
                    PatientSignatureData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicalHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicalHistories_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MedicalHistories_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OdontogramFindings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    RecordedByUserId = table.Column<int>(type: "int", nullable: false),
                    ToothFdi = table.Column<int>(type: "int", nullable: false),
                    Surface = table.Column<int>(type: "int", nullable: false),
                    FindingType = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RecordedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OdontogramFindings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OdontogramFindings_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OdontogramFindings_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OdontogramFindings_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PerioExams",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    ExaminedByUserId = table.Column<int>(type: "int", nullable: false),
                    ExamDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClinicalNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerioExams", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerioExams_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PerioExams_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PerioExams_Users_ExaminedByUserId",
                        column: x => x.ExaminedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Prescriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    PrescribedByUserId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    DrugName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Strength = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DosageForm = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dosage = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Duration = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Refills = table.Column<int>(type: "int", nullable: false),
                    Instructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Indication = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Warnings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PrescriptionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsVoided = table.Column<bool>(type: "bit", nullable: false),
                    VoidReason = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Users_PrescribedByUserId",
                        column: x => x.PrescribedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PerioExamSites",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PerioExamId = table.Column<int>(type: "int", nullable: false),
                    ToothFdi = table.Column<int>(type: "int", nullable: false),
                    Site = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    ProbingDepth = table.Column<int>(type: "int", nullable: true),
                    Recession = table.Column<int>(type: "int", nullable: true),
                    Bleeding = table.Column<bool>(type: "bit", nullable: false),
                    Suppuration = table.Column<bool>(type: "bit", nullable: false),
                    Furcation = table.Column<bool>(type: "bit", nullable: false),
                    Mobility = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerioExamSites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerioExamSites_PerioExams_PerioExamId",
                        column: x => x.PerioExamId,
                        principalTable: "PerioExams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNotes_AmendedFromId",
                table: "ClinicalNotes",
                column: "AmendedFromId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNotes_AppointmentId",
                table: "ClinicalNotes",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNotes_AuthoredByUserId",
                table: "ClinicalNotes",
                column: "AuthoredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNotes_PatientId_CreatedDate",
                table: "ClinicalNotes",
                columns: new[] { "PatientId", "CreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNotes_Status",
                table: "ClinicalNotes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ConsentForms_AppointmentId",
                table: "ConsentForms",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsentForms_CreatedDate",
                table: "ConsentForms",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_ConsentForms_PatientId_Status",
                table: "ConsentForms",
                columns: new[] { "PatientId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ConsentForms_RequestedByUserId",
                table: "ConsentForms",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalHistories_PatientId_IsActive",
                table: "MedicalHistories",
                columns: new[] { "PatientId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_MedicalHistories_RecordedByUserId",
                table: "MedicalHistories",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalHistories_RecordedDate",
                table: "MedicalHistories",
                column: "RecordedDate");

            migrationBuilder.CreateIndex(
                name: "IX_OdontogramFindings_AppointmentId",
                table: "OdontogramFindings",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_OdontogramFindings_PatientId_ToothFdi_IsActive",
                table: "OdontogramFindings",
                columns: new[] { "PatientId", "ToothFdi", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_OdontogramFindings_RecordedByUserId",
                table: "OdontogramFindings",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OdontogramFindings_RecordedDate",
                table: "OdontogramFindings",
                column: "RecordedDate");

            migrationBuilder.CreateIndex(
                name: "IX_PerioExams_AppointmentId",
                table: "PerioExams",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PerioExams_ExaminedByUserId",
                table: "PerioExams",
                column: "ExaminedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PerioExams_PatientId_ExamDate",
                table: "PerioExams",
                columns: new[] { "PatientId", "ExamDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PerioExamSites_PerioExamId_ToothFdi_Site",
                table: "PerioExamSites",
                columns: new[] { "PerioExamId", "ToothFdi", "Site" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_AppointmentId",
                table: "Prescriptions",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_IsVoided",
                table: "Prescriptions",
                column: "IsVoided");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PatientId_PrescriptionDate",
                table: "Prescriptions",
                columns: new[] { "PatientId", "PrescriptionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PrescribedByUserId",
                table: "Prescriptions",
                column: "PrescribedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClinicalNotes");

            migrationBuilder.DropTable(
                name: "ConsentForms");

            migrationBuilder.DropTable(
                name: "MedicalHistories");

            migrationBuilder.DropTable(
                name: "OdontogramFindings");

            migrationBuilder.DropTable(
                name: "PerioExamSites");

            migrationBuilder.DropTable(
                name: "Prescriptions");

            migrationBuilder.DropTable(
                name: "PerioExams");
        }
    }
}
