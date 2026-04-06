using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("partners")]
public class Partner
{
    [Key]
    [Column("partner_id")]
    public int PartnerId { get; set; }

    [Column("partner_name")]
    [MaxLength(256)]
    public string? PartnerName { get; set; }

    [Column("partner_type")]
    [MaxLength(64)]
    public string? PartnerType { get; set; }

    [Column("role_type")]
    [MaxLength(64)]
    public string? RoleType { get; set; }

    [Column("contact_name")]
    [MaxLength(256)]
    public string? ContactName { get; set; }

    [Column("email")]
    [MaxLength(256)]
    public string? Email { get; set; }

    [Column("phone")]
    [MaxLength(64)]
    public string? Phone { get; set; }

    [Column("region")]
    [MaxLength(128)]
    public string? Region { get; set; }

    [Column("status")]
    [MaxLength(64)]
    public string? Status { get; set; }

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
