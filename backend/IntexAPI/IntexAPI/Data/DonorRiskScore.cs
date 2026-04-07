using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("donor_risk_scores")]
public class DonorRiskScore
{
    [Key]
    [Column("supporter_id")]
    public long SupporterId { get; set; }

    [Column("display_name")]
    public string? DisplayName { get; set; }

    [Column("supporter_type")]
    [MaxLength(64)]
    public string? SupporterType { get; set; }

    [Column("churn_risk_score")]
    public decimal? ChurnRiskScore { get; set; }

    [Column("risk_label")]
    [MaxLength(32)]
    public string? RiskLabel { get; set; }

    [Column("recency_days")]
    public long? RecencyDays { get; set; }

    [Column("frequency")]
    public long? Frequency { get; set; }

    [Column("top_factors")]
    [MaxLength(256)]
    public string? TopFactors { get; set; }

    [Column("prediction_timestamp")]
    public string? PredictionTimestamp { get; set; }
}
