using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

public class ApplicationUser : IdentityUser
{
    public int? SupporterId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }

    [Column("accessible_safehouse_ids")]
    public string? AccessibleSafehouseIdsJson { get; set; }
}
