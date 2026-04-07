using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("social_media_posts")]
public class SocialMediaPost
{
    [Key]
    [Column("post_id")]
    public double PostId { get; set; }

    [Column("platform")]
    [MaxLength(64)]
    public string? Platform { get; set; }

    [Column("platform_post_id")]
    [MaxLength(128)]
    public string? PlatformPostId { get; set; }

    [Column("post_url")]
    [MaxLength(2048)]
    public string? PostUrl { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("day_of_week")]
    [MaxLength(32)]
    public string? DayOfWeek { get; set; }

    [Column("post_hour")]
    public double? PostHour { get; set; }

    [Column("post_type")]
    [MaxLength(128)]
    public string? PostType { get; set; }

    [Column("media_type")]
    [MaxLength(64)]
    public string? MediaType { get; set; }

    [Column("caption")]
    public string? Caption { get; set; }

    [Column("hashtags")]
    public string? Hashtags { get; set; }

    [Column("num_hashtags")]
    public double? NumHashtags { get; set; }

    [Column("mentions_count")]
    public double? MentionsCount { get; set; }

    [Column("has_call_to_action")]
    public bool? HasCallToAction { get; set; }

    [Column("call_to_action_type")]
    [MaxLength(128)]
    public string? CallToActionType { get; set; }

    [Column("content_topic")]
    [MaxLength(128)]
    public string? ContentTopic { get; set; }

    [Column("sentiment_tone")]
    [MaxLength(64)]
    public string? SentimentTone { get; set; }

    [Column("caption_length")]
    public double? CaptionLength { get; set; }

    [Column("features_resident_story")]
    public bool? FeaturesResidentStory { get; set; }

    [Column("campaign_name")]
    [MaxLength(256)]
    public string? CampaignName { get; set; }

    [Column("is_boosted")]
    public bool? IsBoosted { get; set; }

    [Column("boost_budget_php")]
    public double? BoostBudgetPhp { get; set; }

    [Column("impressions")]
    public double? Impressions { get; set; }

    [Column("reach")]
    public double? Reach { get; set; }

    [Column("likes")]
    public double? Likes { get; set; }

    [Column("comments")]
    public double? Comments { get; set; }

    [Column("shares")]
    public double? Shares { get; set; }

    [Column("saves")]
    public double? Saves { get; set; }

    [Column("click_throughs")]
    public double? ClickThroughs { get; set; }

    [Column("video_views")]
    public double? VideoViews { get; set; }

    [Column("engagement_rate")]
    public double? EngagementRate { get; set; }

    [Column("profile_visits")]
    public double? ProfileVisits { get; set; }

    [Column("donation_referrals")]
    public double? DonationReferrals { get; set; }

    [Column("estimated_donation_value_php")]
    public double? EstimatedDonationValuePhp { get; set; }

    [Column("follower_count_at_post")]
    public double? FollowerCountAtPost { get; set; }

    [Column("watch_time_seconds")]
    public double? WatchTimeSeconds { get; set; }

    [Column("avg_view_duration_seconds")]
    public double? AvgViewDurationSeconds { get; set; }

    [Column("subscriber_count_at_post")]
    public double? SubscriberCountAtPost { get; set; }

    [Column("forwards")]
    public double? Forwards { get; set; }
}
