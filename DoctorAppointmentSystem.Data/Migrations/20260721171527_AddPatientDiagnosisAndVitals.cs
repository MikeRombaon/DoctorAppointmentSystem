using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoctorAppointmentSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientDiagnosisAndVitals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PatientDiagnoses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    RecordedByUserId = table.Column<int>(type: "int", nullable: false),
                    IcdCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Active"),
                    Severity = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OnsetDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientDiagnoses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientDiagnoses_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientDiagnoses_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientDiagnoses_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PatientDiagnoses_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PatientVitals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    RecordedByUserId = table.Column<int>(type: "int", nullable: false),
                    SystolicBP = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    DiastolicBP = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    HeartRate = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    Temperature = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    Spo2 = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    RespiratoryRate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    Weight = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    Height = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    Bmi = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientVitals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientVitals_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientVitals_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientVitals_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PatientVitals_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PatientDiagnoses_AppointmentId",
                table: "PatientDiagnoses",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDiagnoses_PatientId",
                table: "PatientDiagnoses",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDiagnoses_RecordedByUserId",
                table: "PatientDiagnoses",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDiagnoses_Status",
                table: "PatientDiagnoses",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDiagnoses_TenantId",
                table: "PatientDiagnoses",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVitals_AppointmentId",
                table: "PatientVitals",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVitals_PatientId",
                table: "PatientVitals",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVitals_RecordedAt",
                table: "PatientVitals",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVitals_RecordedByUserId",
                table: "PatientVitals",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVitals_TenantId",
                table: "PatientVitals",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PatientDiagnoses");

            migrationBuilder.DropTable(
                name: "PatientVitals");
        }
    }
}
