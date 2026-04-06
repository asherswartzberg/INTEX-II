using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("safehouses")]
public class Safehouse
{
    [Key]
    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("safehouse_code")]
    [MaxLength(32)]
    public string? SafehouseCode { get; set; }

    [Column("name")]
    [MaxLength(256)]
    public string? Name { get; set; }

    [Column("region")]
    [MaxLength(128)]
    public string? Region { get; set; }

    [Column("city")]
    [MaxLength(128)]
    public string? City { get; set; }

    [Column("province")]
    [MaxLength(128)]
    public string? Province { get; set; }

    [Column("country")]
    [MaxLength(128)]
    public string? Country { get; set; }

    [Column("open_date")]
    public DateOnly? OpenDate { get; set; }

    [Column("status")]
    [MaxLength(64)]
    public string? Status { get; set; }

    [Column("capacity_girls")]
    public int? CapacityGirls { get; set; }

    [Column("capacity_staff")]
    public int? CapacityStaff { get; set; }

    [Column("current_occupancy")]
    public int? CurrentOccupancy { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
