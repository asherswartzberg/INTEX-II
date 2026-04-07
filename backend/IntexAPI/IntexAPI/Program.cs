using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var sqlConnection = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
var identityConnection = builder.Configuration.GetConnectionString("IdentityConnection")
    ?? throw new InvalidOperationException("Connection string 'IdentityConnection' is not configured.");

// --- Operational DB (Azure SQL) ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        sqlConnection,
        sql => sql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null)));

// --- Identity DB (Supabase PostgreSQL) ---
builder.Services.AddDbContext<IdentityContext>(options =>
    options.UseNpgsql(identityConnection));

// --- Identity (cookie-based, with built-in API endpoints) ---
builder.Services.AddIdentityApiEndpoints<ApplicationUser>(options =>
{
    // IS 414 password policy
    options.Password.RequiredLength = 12;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireDigit = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredUniqueChars = 4;

    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<IdentityContext>()
.AddDefaultTokenProviders();

// --- Identity cookie configuration ---
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

// --- Google OAuth (optional) ---
// Google OAuth — only register if real credentials are configured
var googleClientId = builder.Configuration["Google:ClientId"];
var googleClientSecret = builder.Configuration["Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleClientId)
    && !googleClientId.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase)
    && !string.IsNullOrWhiteSpace(googleClientSecret)
    && !googleClientSecret.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = IdentityConstants.ExternalScheme;
    });
}

// --- Authorization policies ---
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.RequireAdmin, policy =>
        policy.RequireRole(AuthRoles.Admin));
    options.AddPolicy(AuthPolicies.RequireStaff, policy =>
        policy.RequireRole(AuthRoles.Admin, AuthRoles.Staff));
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "https://localhost:5173",
                "https://localhost:3000",
                "https://victorious-plant-08e77061e.7.azurestaticapps.net")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// --- Identity schema + seed ---
try
{
    using var scope = app.Services.CreateScope();
    var identityDb = scope.ServiceProvider.GetRequiredService<IdentityContext>();
    await identityDb.Database.MigrateAsync();
    await SeedData.Initialize(scope.ServiceProvider);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Failed to migrate/seed identity data — app will still start");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseSecurityHeaders();
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Built-in Identity API endpoints (login, register, 2FA, etc.)
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();

app.Run();
