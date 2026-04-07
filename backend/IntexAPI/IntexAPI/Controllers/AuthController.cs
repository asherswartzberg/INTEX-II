using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using IntexAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace IntexAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
    }

    // ── Login ──────────────────────────────────────────────
    public record LoginRequest(string Email, string Password);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid email or password." });

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        SetTokenCookie(token);

        return Ok(new
        {
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            roles,
            supporterId = user.SupporterId
        });
    }

    // ── Register (Donor self-registration) ────────────────
    public record RegisterRequest(string Email, string Password, string FirstName, string LastName, string Role);

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return BadRequest(new { message = "An account with this email already exists." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            EmailConfirmed = true,
            TwoFactorEnabled = false
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

        string[] validRoles = ["Admin", "Staff", "Donor"];
        var role = validRoles.Contains(request.Role) ? request.Role : "Donor";
        await _userManager.AddToRoleAsync(user, role);

        return Ok(new { message = "Account created. Please log in." });
    }

    // ── Me (current user info) ────────────────────────────
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new
        {
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            roles,
            supporterId = user.SupporterId
        });
    }

    // ── Logout ────────────────────────────────────────────
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("access_token", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None
        });
        return Ok(new { message = "Logged out." });
    }

    // ── Google OAuth ──────────────────────────────────────
    [HttpGet("google-login")]
    public IActionResult GoogleLogin()
    {
        var redirectUrl = Url.Action(nameof(GoogleCallback), "Auth", null, Request.Scheme);
        var properties = new Microsoft.AspNetCore.Authentication.AuthenticationProperties { RedirectUri = redirectUrl };
        return Challenge(properties, "Google");
    }

    [HttpGet("google-login/callback")]
    public async Task<IActionResult> GoogleCallback()
    {
        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info == null)
            return Redirect("http://localhost:5173/login?error=google-failed");

        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        if (email == null)
            return Redirect("http://localhost:5173/login?error=no-email");

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            // Create new user from Google account
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FirstName = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? "",
                LastName = info.Principal.FindFirstValue(ClaimTypes.Surname) ?? "",
                EmailConfirmed = true,
                TwoFactorEnabled = false
            };

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
                return Redirect("http://localhost:5173/login?error=create-failed");

            await _userManager.AddToRoleAsync(user, "Donor");
            await _userManager.AddLoginAsync(user, info);
        }
        else
        {
            // Link Google login if not already linked
            var logins = await _userManager.GetLoginsAsync(user);
            if (!logins.Any(l => l.LoginProvider == info.LoginProvider))
                await _userManager.AddLoginAsync(user, info);
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        SetTokenCookie(token);

        // Redirect to frontend
        var redirectPath = roles.Contains("Admin") || roles.Contains("Staff") ? "/admin" : "/donor";
        return Redirect($"http://localhost:5173{redirectPath}");
    }

    // ── Helpers ───────────────────────────────────────────
    private string GenerateJwtToken(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new("firstName", user.FirstName ?? ""),
            new("lastName", user.LastName ?? ""),
        };

        if (user.SupporterId.HasValue)
            claims.Add(new Claim("supporterId", user.SupporterId.Value.ToString()));

        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expMinutes = int.Parse(_config["Jwt:ExpirationMinutes"] ?? "60");

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private void SetTokenCookie(string token)
    {
        Response.Cookies.Append("access_token", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddHours(1)
        });
    }
}
