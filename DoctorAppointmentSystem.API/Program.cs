using DoctorAppointmentSystem.API.Authorization;
using DoctorAppointmentSystem.API.Interceptors;
using DoctorAppointmentSystem.API.Middleware;
using DoctorAppointmentSystem.API.Services;
using DoctorAppointmentSystem.Domain;
using DoctorAppointmentSystem.Data;
using DoctorAppointmentSystem.Data.Seeding;
using DoctorAppointmentSystem.Repositories;
using DoctorAppointmentSystem.Repositories.Interfaces;
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
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
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
builder.Services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure();
            sqlOptions.MigrationsAssembly("DoctorAppointmentSystem.Data");
        });
    // Wire scoped audit interceptor into the context
    var interceptor = serviceProvider.GetRequiredService<AuditSaveChangesInterceptor>();
    options.AddInterceptors(interceptor);
});

// Register repositories and unit of work
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Register authentication service
builder.Services.AddScoped<IAuthService, AuthService>();

// TenantContext — per-request, populated by TenantMiddleware
builder.Services.AddScoped<TenantContext>();

// Audit interceptor — automatic EF Core audit trail
builder.Services.AddScoped<AuditSaveChangesInterceptor>();

// Register email service — switch to SmtpEmailService when Email:Provider = "Smtp"
var emailProvider = builder.Configuration["Email:Provider"] ?? "File";
if (emailProvider.Equals("Smtp", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddScoped<IEmailService, SmtpEmailService>();
else
    builder.Services.AddScoped<IEmailService, FileEmailService>();

// Subscription lifecycle — daily expiry checks and email notifications
builder.Services.AddHostedService<SubscriptionNotificationService>();

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

    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        // Fired when authentication fails (bad/expired/missing token → 401)
        OnChallenge = ctx =>
        {
            // Let the default challenge run first so it sets WWW-Authenticate
            return Task.CompletedTask;
        },
        // Fired when a valid token lacks the required role/policy → 403
        OnForbidden = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync("{\"message\":\"You do not have permission to perform this action.\"}");
        }
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
app.UseMiddleware<TenantMiddleware>();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint — used by ECS/ALB target group health checks
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

// SPA fallback — serve index.html for all non-API routes so React Router handles deep links
app.MapFallbackToFile("index.html");

app.Run();
