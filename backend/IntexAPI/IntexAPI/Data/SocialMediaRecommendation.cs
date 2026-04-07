using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Data;

[Keyless]
[Table("social_media_recommendations")]
public class SocialMediaRecommendation
{
    [Column("platform")]
    public string? Platform { get; set; }

    [Column("post_type")]
    public string? PostType { get; set; }

    [Column("media_type")]
    public string? MediaType { get; set; }

    [Column("content_topic")]
    public string? ContentTopic { get; set; }

    [Column("day_of_week")]
    public string? DayOfWeek { get; set; }

    [Column("predicted_donation_referrals")]
    public decimal? PredictedDonationReferrals { get; set; }

    [Column("predicted_engagement_rate")]
    public double? PredictedEngagementRate { get; set; }

    [Column("prediction_timestamp")]
    public string? PredictionTimestamp { get; set; }
}
