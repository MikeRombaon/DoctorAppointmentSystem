using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DentalInformationSystem.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsWalkInToAppointments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsWalkIn",
                table: "Appointments",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsWalkIn",
                table: "Appointments");
        }
    }
}
