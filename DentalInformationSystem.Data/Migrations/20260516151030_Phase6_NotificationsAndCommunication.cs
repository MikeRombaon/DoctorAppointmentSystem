using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DentalInformationSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase6_NotificationsAndCommunication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommunicationLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Channel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Recipient = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RelatedEntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RelatedEntityId = table.Column<int>(type: "int", nullable: true),
                    SentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SentByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunicationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunicationLogs_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CommunicationLogs_Users_SentByUserId",
                        column: x => x.SentByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReminderLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReminderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DaysAhead = table.Column<int>(type: "int", nullable: false),
                    AppointmentsFound = table.Column<int>(type: "int", nullable: false),
                    RemindersSent = table.Column<int>(type: "int", nullable: false),
                    RemindersFailed = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TriggeredByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReminderLogs_Users_TriggeredByUserId",
                        column: x => x.TriggeredByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_PatientId",
                table: "CommunicationLogs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_SentByUserId",
                table: "CommunicationLogs",
                column: "SentByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_SentDate",
                table: "CommunicationLogs",
                column: "SentDate");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_Type",
                table: "CommunicationLogs",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedDate",
                table: "Notifications",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderLogs_ReminderDate",
                table: "ReminderLogs",
                column: "ReminderDate");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderLogs_TriggeredByUserId",
                table: "ReminderLogs",
                column: "TriggeredByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommunicationLogs");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "ReminderLogs");
        }
    }
}
