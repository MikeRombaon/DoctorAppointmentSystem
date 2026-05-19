using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace DentalInformationSystem.Data;

/// <summary>
/// Design-time factory for ApplicationDbContext.
/// Required for EF Core migrations when DbContext is in a separate assembly from the startup project.
/// </summary>
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../DentalInformationSystem.API"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        // Get connection string
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' not found in appsettings.json. " +
                "Please ensure the API project's appsettings.json contains a valid connection string.");
        }

        // Build DbContextOptions
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlServer(
            connectionString,
            b => b.MigrationsAssembly("DentalInformationSystem.Data"));

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
