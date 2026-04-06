using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("supporters")]
public class Supporter
{
    [Key]
    [Column("supporter_id")]
    public int SupporterId { get; set; }

    [Column("supporter_type")]
    [MaxLength(64)]
    public string? SupporterType { get; set; }

    [Column("display_name")]
    [MaxLength(256)]
    public string? DisplayName { get; set; }

    [Column("organization_name")]
    [MaxLength(256)]
    public string? OrganizationName { get; set; }

    [Column("first_name")]
    [MaxLength(128)]
    public string? FirstName { get; set; }

    [Column("last_name")]
    [MaxLength(128)]
    public string? LastName { get; set; }

    [Column("relationship_type")]
    [MaxLength(64)]
    public string? RelationshipType { get; set; }

    [Column("region")]
    [MaxLength(128)]
    public string? Region { get; set; }

    [Column("country")]
    [MaxLength(128)]
    public string? Country { get; set; }

    [Column("email")]
    [MaxLength(256)]
    public string? Email { get; set; }

    [Column("phone")]
    [MaxLength(64)]
    public string? Phone { get; set; }

    [Column("status")]
    [MaxLength(64)]
    public string? Status { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("first_donation_date")]
    public DateOnly? FirstDonationDate { get; set; }

    [Column("acquisition_channel")]
    [MaxLength(128)]
    public string? AcquisitionChannel { get; set; }
}
