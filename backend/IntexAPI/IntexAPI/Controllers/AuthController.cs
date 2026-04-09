using System.Security.Claims;
using IntexAPI.Data;
using IntexAPI.Infrastructure;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    AppDbContext appDb,
    FacilityAccessService facilityAccess,
    IConfiguration configuration) : ControllerBase
{
    private const string DefaultFrontendUrl = "http://localhost:5173";

    // ── Current session info (always 200) ─────────────────
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentSession()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Ok(new
            {
                isAuthenticated = false,
                userName = (string?)null,
                email = (string?)null,
                firstName = (string?)null,
                lastName = (string?)null,
                roles = Array.Empty<string>(),
                supporterId = (int?)null
            });
        }

        var user = await userManager.GetUserAsync(User);
        var roles = User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(r => r)
            .ToArray();

        return Ok(new
        {
            isAuthenticated = true,
            userName = user?.UserName ?? User.Identity?.Name,
            email = user?.Email,
            firstName = user?.FirstName,
            lastName = user?.LastName,
            roles,
            supporterId = user?.SupporterId,
            accessibleSafehouseIds = await facilityAccess.GetAccessibleSafehouseIdsAsync(User, HttpContext.RequestAborted)
        });
    }

    // ── Registration (assigns Donor role) ─────────────────
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { detail = "Email and password are required." });

        try
        {
            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = InputSanitizer.Sanitize(request.FirstName),
                LastName = InputSanitizer.Sanitize(request.LastName),
            };

            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                var message = string.Join(" ", result.Errors.Select(e => e.Description));
                return BadRequest(new { detail = message });
            }

            await userManager.AddToRoleAsync(user, AuthRoles.Donor);

            // Create a matching Supporter record in the operational DB
            var maxId = await appDb.Supporters.AnyAsync() ? await appDb.Supporters.MaxAsync(s => s.SupporterId) : 0;
            var supporter = new Supporter
            {
                SupporterId = maxId + 1,
                SupporterType = InputSanitizer.Sanitize(request.SupporterType) ?? "MonetaryDonor",
                DisplayName = !string.IsNullOrWhiteSpace(request.FirstName) ? $"{InputSanitizer.Sanitize(request.FirstName)} {InputSanitizer.Sanitize(request.LastName)}".Trim() : request.Email,
                FirstName = InputSanitizer.Sanitize(request.FirstName) ?? "",
                LastName = InputSanitizer.Sanitize(request.LastName) ?? "",
                OrganizationName = "",
                RelationshipType = "Local",
                Region = "Unknown",
                Country = "Chile",
                Email = request.Email,
                Phone = "",
                Status = "Active",
                FirstDonationDate = null,
                CreatedAt = DateTime.UtcNow,
                AcquisitionChannel = "Website",
            };
            appDb.Supporters.Add(supporter);
            await appDb.SaveChangesAsync();

            user.SupporterId = supporter.SupporterId;
            await userManager.UpdateAsync(user);

            return Ok();
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? "none";
            return StatusCode(500, new { detail = $"Registration failed: {ex.Message} | Inner: {inner}" });
        }
    }

    // ── External provider discovery ───────────────────────
    [HttpGet("providers")]
    public IActionResult GetExternalProviders()
    {
        var providers = new List<object>();

        if (IsGoogleConfigured())
        {
            providers.Add(new
            {
                name = GoogleDefaults.AuthenticationScheme,
                displayName = "Google"
            });
        }

        return Ok(providers);
    }

    // ── External login (Google OAuth) ─────────────────────
    [HttpGet("external-login")]
    public IActionResult ExternalLogin(
        [FromQuery] string provider,
        [FromQuery] string? returnPath = null)
    {
        if (!string.Equals(provider, GoogleDefaults.AuthenticationScheme, StringComparison.OrdinalIgnoreCase)
            || !IsGoogleConfigured())
        {
            return BadRequest(new { message = "The requested external login provider is not available." });
        }

        var normalizedReturn = NormalizeReturnPath(returnPath);
        var callbackUrl = $"{GetFrontendUrl().TrimEnd('/')}/api/auth/external-callback?returnPath={Uri.EscapeDataString(normalizedReturn)}";

        if (string.IsNullOrWhiteSpace(callbackUrl))
        {
            return Problem("Unable to create the external login callback URL.");
        }

        var properties = signInManager.ConfigureExternalAuthenticationProperties(
            GoogleDefaults.AuthenticationScheme,
            callbackUrl);

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    // ── External login callback ───────────────────────────
    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalLoginCallback(
        [FromQuery] string? returnPath = null,
        [FromQuery] string? remoteError = null)
    {
        if (!string.IsNullOrWhiteSpace(remoteError))
        {
            return Redirect(BuildFrontendErrorUrl("External login failed."));
        }

        var info = await signInManager.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return Redirect(BuildFrontendErrorUrl("External login information was unavailable."));
        }

        // Try to sign in with existing external login
        var signInResult = await signInManager.ExternalLoginSignInAsync(
            info.LoginProvider,
            info.ProviderKey,
            isPersistent: false,
            bypassTwoFactor: true);

        if (signInResult.Succeeded)
        {
            return Redirect(BuildFrontendSuccessUrl(returnPath));
        }

        // New user — create account from Google profile
        var email = info.Principal.FindFirstValue(ClaimTypes.Email)
                    ?? info.Principal.FindFirstValue("email");

        if (string.IsNullOrWhiteSpace(email))
        {
            return Redirect(BuildFrontendErrorUrl("The external provider did not return an email address."));
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FirstName = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "",
                LastName = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "",
                EmailConfirmed = true
            };

            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                return Redirect(BuildFrontendErrorUrl("Unable to create a local account for the external login."));
            }

            await userManager.AddToRoleAsync(user, AuthRoles.Donor);
        }

        var addLoginResult = await userManager.AddLoginAsync(user, info);
        if (!addLoginResult.Succeeded)
        {
            // Login may already be linked — that's okay
            var existingLogins = await userManager.GetLoginsAsync(user);
            if (!existingLogins.Any(l => l.LoginProvider == info.LoginProvider))
            {
                return Redirect(BuildFrontendErrorUrl("Unable to associate the external login with the local account."));
            }
        }

        await signInManager.SignInAsync(user, isPersistent: false, info.LoginProvider);
        return Redirect(BuildFrontendSuccessUrl(returnPath));
    }

    // ── Logout ────────────────────────────────────────────
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return Ok(new { message = "Logout successful." });
    }

    // ── Donor: get my profile + donations ──────────────────

    [HttpGet("my-profile")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = AuthRoles.Donor)]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user?.SupporterId == null)
            return Ok(new { supporter = (object?)null, donations = Array.Empty<object>() });

        object? supporter = null;
        object[] donations = [];

        try
        {
            supporter = await appDb.Supporters.FindAsync(user.SupporterId);
        }
        catch { /* type mismatch — return null */ }

        try
        {
            donations = await appDb.Donations
                .Where(d => d.SupporterId == user.SupporterId)
                .OrderByDescending(d => d.DonationDate)
                .Select(d => new
                {
                    d.DonationId,
                    d.SupporterId,
                    d.DonationType,
                    d.DonationDate,
                    d.IsRecurring,
                    d.CampaignName,
                    d.ChannelSource,
                    d.CurrencyCode,
                    d.Amount,
                    d.EstimatedValue,
                    d.ImpactUnit,
                    d.Notes,
                })
                .ToArrayAsync<object>();
        }
        catch { /* type mismatch — return empty */ }

        object[] allocations = [];
        try
        {
            var donationIds = await appDb.Donations
                .Where(d => d.SupporterId == user.SupporterId)
                .Select(d => d.DonationId)
                .ToListAsync();
            allocations = await appDb.DonationAllocations
                .Where(a => donationIds.Contains(a.DonationId ?? 0))
                .Select(a => new { a.AllocationId, a.DonationId, a.ProgramArea })
                .ToArrayAsync<object>();
        }
        catch { /* ignore */ }

        return Ok(new { supporter, donations, allocations });
    }

    // ── Donor: submit donation ─────────────────────────────

    public record DonorDonationRequest(
        int Amount,
        string? CurrencyCode,
        string? DonationType,
        string? CampaignName,
        bool IsRecurring,
        string? Notes
    );

    [HttpPost("donate")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = AuthRoles.Donor)]
    public async Task<IActionResult> SubmitDonation([FromBody] DonorDonationRequest request)
    {
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user?.SupporterId == null)
            return BadRequest(new { message = "Your account is not linked to a donor profile." });

        var maxDonationId = await appDb.Donations.AnyAsync() ? await appDb.Donations.MaxAsync(d => d.DonationId) : 0;
        var donation = new Donation
        {
            DonationId = maxDonationId + 1,
            SupporterId = user.SupporterId ?? 0,
            DonationType = InputSanitizer.Sanitize(request.DonationType) ?? "Monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            IsRecurring = request.IsRecurring,
            CampaignName = InputSanitizer.Sanitize(request.CampaignName),
            ChannelSource = "Website",
            CurrencyCode = request.CurrencyCode ?? "USD",
            Amount = request.Amount,
            EstimatedValue = request.Amount,
            ImpactUnit = "pesos",
            Notes = InputSanitizer.Sanitize(request.Notes) ?? "",
        };

        appDb.Donations.Add(donation);
        await appDb.SaveChangesAsync();

        return Ok(new { message = "Donation recorded. Thank you!", donationId = donation.DonationId });
    }

    // ── User management (Admin only) ──────────────────────

    public record CreateUserRequest(string Email, string Password, string FirstName, string LastName, string Role, int[]? AccessibleSafehouseIds);
    public record UpdateUserRequest(string Email, string? Password, string FirstName, string LastName, string Role, int[]? AccessibleSafehouseIds);

    [HttpPost("users")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        string[] validRoles = [AuthRoles.Admin, AuthRoles.Staff, AuthRoles.Donor];
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { message = "Invalid role." });

        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return BadRequest(new { message = "An account with this email already exists." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = InputSanitizer.Sanitize(request.FirstName),
            LastName = InputSanitizer.Sanitize(request.LastName),
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

        await userManager.AddToRoleAsync(user, request.Role);
        user.AccessibleSafehouseIdsJson = request.Role == AuthRoles.Staff
            ? UserFacilityAccess.Serialize(request.AccessibleSafehouseIds ?? [])
            : "[]";

        // If Donor, create a Supporter record
        if (request.Role == AuthRoles.Donor)
        {
            var maxId = await appDb.Supporters.AnyAsync() ? await appDb.Supporters.MaxAsync(s => s.SupporterId) : 0;
            var supporter = new Supporter
            {
                SupporterId = maxId + 1,
                SupporterType = "MonetaryDonor",
                DisplayName = $"{request.FirstName} {request.LastName}".Trim(),
                FirstName = request.FirstName ?? "",
                LastName = request.LastName ?? "",
                OrganizationName = "",
                RelationshipType = "Local",
                Region = "Unknown",
                Country = "Chile",
                Email = request.Email,
                Phone = "",
                Status = "Active",
                FirstDonationDate = null,
                CreatedAt = DateTime.UtcNow,
                AcquisitionChannel = "Website",
            };
            appDb.Supporters.Add(supporter);
            await appDb.SaveChangesAsync();
            user.SupporterId = supporter.SupporterId;
        }

        await userManager.UpdateAsync(user);

        return Ok(new { message = "User created.", userId = user.Id });
    }

    [HttpGet("users")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> ListUsers([FromQuery] string? role = null)
    {
        var users = userManager.Users.AsEnumerable();
        var result = new List<object>();

        foreach (var u in users)
        {
            var roles = await userManager.GetRolesAsync(u);
            if (role != null && !roles.Contains(role)) continue;
            result.Add(new
            {
                id = u.Id,
                email = u.Email,
                firstName = u.FirstName,
                lastName = u.LastName,
                roles,
                accessibleSafehouseIds = UserFacilityAccess.Parse(u.AccessibleSafehouseIdsJson)
            });
        }

        return Ok(result);
    }

    [HttpPut("users/{id}")]
    [HttpPost("users/{id}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        string[] validRoles = [AuthRoles.Admin, AuthRoles.Staff, AuthRoles.Donor];
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { message = "Invalid role." });

        var user = await userManager.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var existingEmailUser = await userManager.FindByEmailAsync(request.Email);
        if (existingEmailUser != null && existingEmailUser.Id != user.Id)
            return BadRequest(new { message = "An account with this email already exists." });

        user.UserName = request.Email;
        user.Email = request.Email;
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.AccessibleSafehouseIdsJson = request.Role == AuthRoles.Staff
            ? UserFacilityAccess.Serialize(request.AccessibleSafehouseIds ?? [])
            : "[]";

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { message = string.Join(" ", updateResult.Errors.Select(e => e.Description)) });

        var existingRoles = await userManager.GetRolesAsync(user);
        var rolesToRemove = existingRoles.Where(r => r != request.Role).ToArray();
        if (rolesToRemove.Length > 0)
            await userManager.RemoveFromRolesAsync(user, rolesToRemove);
        if (!existingRoles.Contains(request.Role))
            await userManager.AddToRoleAsync(user, request.Role);

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, token, request.Password);
            if (!resetResult.Succeeded)
                return BadRequest(new { message = string.Join(" ", resetResult.Errors.Select(e => e.Description)) });
        }

        return Ok(new { message = "User updated." });
    }

    [HttpDelete("users/{id}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Prevent deleting yourself
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (user.Id == currentUserId)
            return BadRequest(new { message = "You cannot delete your own account." });

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

        return Ok(new { message = "User deleted." });
    }

    // ── Helpers ───────────────────────────────────────────
    private bool IsGoogleConfigured()
    {
        return !string.IsNullOrWhiteSpace(configuration["Google:ClientId"])
               && !string.IsNullOrWhiteSpace(configuration["Google:ClientSecret"])
               && !configuration["Google:ClientId"]!.Contains("YOUR_GOOGLE", StringComparison.OrdinalIgnoreCase);
    }

    private string GetFrontendUrl()
    {
        return configuration["FrontendUrl"] ?? DefaultFrontendUrl;
    }

    private static string NormalizeReturnPath(string? returnPath)
    {
        if (string.IsNullOrWhiteSpace(returnPath) || !returnPath.StartsWith('/'))
            return "/admin";
        return returnPath;
    }

    private string BuildFrontendSuccessUrl(string? returnPath)
    {
        return $"{GetFrontendUrl().TrimEnd('/')}{NormalizeReturnPath(returnPath)}";
    }

    private string BuildFrontendErrorUrl(string errorMessage)
    {
        var loginUrl = $"{GetFrontendUrl().TrimEnd('/')}/login";
        return QueryHelpers.AddQueryString(loginUrl, "externalError", errorMessage);
    }
}

public record RegisterRequest(string Email, string Password, string? FirstName = null, string? LastName = null, string? SupporterType = null);
