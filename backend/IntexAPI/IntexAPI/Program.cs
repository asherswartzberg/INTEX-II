using IntexAPI.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

// --- Identity ---
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
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
.AddEntityFrameworkStores<IdentityContext>()
.AddDefaultTokenProviders();

// --- JWT Authentication ---
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "IntexAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "IntexFrontend";

var authBuilder = builder.Services.AddAuthentication(options =>
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
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // Read JWT from httpOnly cookie
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            context.Token = context.Request.Cookies["access_token"];
            return Task.CompletedTask;
        }
    };
});

var googleClientId = builder.Configuration["Google:ClientId"];
var googleClientSecret = builder.Configuration["Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleClientId)
    && !googleClientId.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase)
    && !string.IsNullOrWhiteSpace(googleClientSecret)
    && !googleClientSecret.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase))
{
    authBuilder.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
    });
}

builder.Services.AddAuthorization();
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

// --- Identity schema + seed (startup failure here → check Supabase URL, password, firewall, and migrations) ---
using (var scope = app.Services.CreateScope())
{
    var identityDb = scope.ServiceProvider.GetRequiredService<IdentityContext>();
    await identityDb.Database.MigrateAsync();
    await SeedData.Initialize(scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
