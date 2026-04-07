using Microsoft.AspNetCore.Identity;

namespace IntexAPI.Data;

public class ApplicationUser : IdentityUser
{
    public int? SupporterId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
