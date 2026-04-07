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

    [Column("sentiment_tone")]
    public string? SentimentTone { get; set; }

    [Column("day_of_week")]
    public string? DayOfWeek { get; set; }

    [Column("post_hour")]
    public int? PostHour { get; set; }

    [Column("has_call_to_action")]
    public bool? HasCallToAction { get; set; }

    [Column("is_boosted")]
    public bool? IsBoosted { get; set; }

    [Column("num_hashtags")]
    public int? NumHashtags { get; set; }

    [Column("caption_length")]
    public int? CaptionLength { get; set; }

    [Column("features_resident_story")]
    public bool? FeaturesResidentStory { get; set; }

    [Column("mentions_count")]
    public int? MentionsCount { get; set; }

    [Column("boost_budget_php")]
    public int? BoostBudgetPhp { get; set; }

    [Column("predicted_donation_referrals")]
    public double? PredictedDonationReferrals { get; set; }

    [Column("prediction_timestamp")]
    public string? PredictionTimestamp { get; set; }
}
