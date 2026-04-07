using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("resident_risk_scores")]
public class ResidentRiskScore
{
    [Key]
    [Column("resident_id")]
    public long ResidentId { get; set; }

    [Column("readiness_score")]
    public double? ReadinessScore { get; set; }

    [Column("risk_label")]
    [MaxLength(32)]
    public string? RiskLabel { get; set; }

    [Column("predicted_high_risk")]
    public long? PredictedHighRisk { get; set; }

    [Column("top_factors")]
    [MaxLength(256)]
    public string? TopFactors { get; set; }

    [Column("prediction_timestamp")]
    public string? PredictionTimestamp { get; set; }
}
