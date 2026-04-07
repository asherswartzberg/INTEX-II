using Microsoft.AspNetCore.Identity;

namespace IntexAPI.Data;

public static class SeedData
{
    public static async Task Initialize(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Create roles
        string[] roles = ["Admin", "Staff", "Donor"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed users (no 2FA for grading access)
        await EnsureUser(userManager, "admin@intex.com", "Admin123!Special", "Admin", "Admin", "User", null);
        await EnsureUser(userManager, "staff@intex.com", "Staff123!Special", "Staff", "Staff", "User", null);
        await EnsureUser(userManager, "donor@intex.com", "Donor123!Special", "Donor", "Donor", "User", 1);
    }

    private static async Task EnsureUser(
        UserManager<ApplicationUser> userManager,
        string email, string password, string role,
        string firstName, string lastName, int? supporterId)
    {
        if (await userManager.FindByEmailAsync(email) != null) return;

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            SupporterId = supporterId,
            EmailConfirmed = true,
            TwoFactorEnabled = false
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(user, role);
    }
}
