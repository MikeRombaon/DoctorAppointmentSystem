using DentalInformationSystem.API.Authorization;
using DentalInformationSystem.API.Services;
using DentalInformationSystem.Data;
using DentalInformationSystem.Data.Seeding;
using DentalInformationSystem.Repositories;
using DentalInformationSystem.Repositories.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();

// SWAGGER - Swashbuckle.AspNetCore 10.1.4
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Dental Information System API",
        Version = "v1",
        Description = "RBAC-enabled API for managing dental clinic operations and inventory"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by your JWT token"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure()));

// Register repositories and unit of work
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Register authentication service
builder.Services.AddScoped<IAuthService, AuthService>();

// Register email service — switch to SmtpEmailService when Email:Provider = "Smtp"
var emailProvider = builder.Configuration["Email:Provider"] ?? "File";
if (emailProvider.Equals("Smtp", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddScoped<IEmailService, SmtpEmailService>();
else
    builder.Services.AddScoped<IEmailService, FileEmailService>();

// Phase 3 — Audit & HTTP context
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuditService, AuditService>();

// Phase 3 — static file uploads
builder.Services.AddDirectoryBrowser();


// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

// Configure Authorization with Policies
builder.Services.AddAuthorization(options =>
{
    Policies.AddPolicies(options);
});

// Configure CORS
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"];
    options.AddPolicy("AllowAll",
        corsBuilder =>
        {
            if (!string.IsNullOrWhiteSpace(allowedOrigins))
            {
                corsBuilder.WithOrigins(allowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries))
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            }
            else
            {
                corsBuilder.AllowAnyOrigin()
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            }
        });
});

var app = builder.Build();

// Seed database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var authService = services.GetRequiredService<IAuthService>();
        
        // Apply migrations
        context.Database.Migrate();
        
        // Seed data with hashed passwords
        DataSeeder.SeedData(context);
        
        // Update user passwords to use proper hashing
        var users = context.Users.ToList();
        foreach (var user in users)
        {
            if (user.PasswordHash == "hashed_password_here")
            {
                // Default password for seeded users: "Password123!"
                user.PasswordHash = authService.HashPassword("Password123!");
            }
        }
        context.SaveChanges();
        
        app.Logger.LogInformation("Database seeded successfully with RBAC users");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred while seeding the database");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Dental Information System API v1");
        c.RoutePrefix = "swagger"; // Changed from string.Empty to "swagger"
    });
}

app.UseStaticFiles(); // serves wwwroot (React SPA + uploads)

app.UseCors("AllowAll");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint — used by ECS/ALB target group health checks
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

// SPA fallback — serve index.html for all non-API routes so React Router handles deep links
app.MapFallbackToFile("index.html");

app.Run();
