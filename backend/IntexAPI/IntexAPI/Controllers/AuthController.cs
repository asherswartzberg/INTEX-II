using System.Security.Claims;
using IntexAPI.Data;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
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
            supporterId = user?.SupporterId
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
            };

            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                var message = string.Join(" ", result.Errors.Select(e => e.Description));
                return BadRequest(new { detail = message });
            }

            await userManager.AddToRoleAsync(user, AuthRoles.Donor);
            return Ok();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { detail = $"Registration failed: {ex.Message}" });
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

        var callbackUrl = Url.Action(nameof(ExternalLoginCallback), new
        {
            returnPath = NormalizeReturnPath(returnPath)
        });

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

    // ── User management (Admin only) ──────────────────────

    public record CreateUserRequest(string Email, string Password, string FirstName, string LastName, string Role);

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
            FirstName = request.FirstName,
            LastName = request.LastName,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

        await userManager.AddToRoleAsync(user, request.Role);
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
                roles
            });
        }

        return Ok(result);
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

public record RegisterRequest(string Email, string Password);
