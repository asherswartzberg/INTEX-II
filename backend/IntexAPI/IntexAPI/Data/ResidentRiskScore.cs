using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("resident_risk_scores")]
public class ResidentRiskScore
{
    [Key]
    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("readiness_score")]
    public double? ReadinessScore { get; set; }

    [Column("readiness_label")]
    [MaxLength(32)]
    public string? ReadinessLabel { get; set; }

    [Column("predicted_ready")]
    public int? PredictedReady { get; set; }

    [Column("prediction_timestamp")]
    public string? PredictionTimestamp { get; set; }
}
