using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("partner_assignments")]
public class PartnerAssignment
{
    [Key]
    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [Column("partner_id")]
    public int? PartnerId { get; set; }

    [Column("safehouse_id")]
    public int? SafehouseId { get; set; }

    [Column("program_area")]
    [MaxLength(128)]
    public string? ProgramArea { get; set; }

    [Column("assignment_start")]
    public DateOnly? AssignmentStart { get; set; }

    [Column("assignment_end")]
    public DateOnly? AssignmentEnd { get; set; }

    [Column("responsibility_notes")]
    public string? ResponsibilityNotes { get; set; }

    [Column("is_primary")]
    public bool? IsPrimary { get; set; }

    [Column("status")]
    [MaxLength(64)]
    public string? Status { get; set; }
}
