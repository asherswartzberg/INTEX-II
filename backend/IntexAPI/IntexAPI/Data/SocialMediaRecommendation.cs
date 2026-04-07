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
    public long? PostHour { get; set; }

    [Column("has_call_to_action")]
    public bool? HasCallToAction { get; set; }

    [Column("is_boosted")]
    public bool? IsBoosted { get; set; }

    [Column("num_hashtags")]
    public long? NumHashtags { get; set; }

    [Column("caption_length")]
    public long? CaptionLength { get; set; }

    [Column("features_resident_story")]
    public bool? FeaturesResidentStory { get; set; }

    [Column("mentions_count")]
    public long? MentionsCount { get; set; }

    [Column("boost_budget_php")]
    public long? BoostBudgetPhp { get; set; }

    [Column("predicted_donation_referrals")]
    public decimal? PredictedDonationReferrals { get; set; }

    [Column("prediction_timestamp")]
    public string? PredictionTimestamp { get; set; }
}
