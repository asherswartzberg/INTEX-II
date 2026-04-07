using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("in_kind_donation_items")]
public class InKindDonationItem
{
    [Key]
    [Column("item_id")]
    public int ItemId { get; set; }

    [Column("donation_id")]
    public int? DonationId { get; set; }

    [Column("item_name")]
    [MaxLength(256)]
    public string? ItemName { get; set; }

    [Column("item_category")]
    [MaxLength(128)]
    public string? ItemCategory { get; set; }

    [Column("quantity")]
    public int? Quantity { get; set; }

    [Column("unit_of_measure")]
    [MaxLength(64)]
    public string? UnitOfMeasure { get; set; }

    [Column("estimated_unit_value")]
    public decimal? EstimatedUnitValue { get; set; }

    [Column("intended_use")]
    [MaxLength(128)]
    public string? IntendedUse { get; set; }

    [Column("received_condition")]
    [MaxLength(64)]
    public string? ReceivedCondition { get; set; }
}
