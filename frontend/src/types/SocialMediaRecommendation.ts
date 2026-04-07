/** Table `social_media_recommendations` — ML posting strategy predictions */
export interface SocialMediaRecommendation {
  platform: string | null
  postType: string | null
  mediaType: string | null
  contentTopic: string | null
  dayOfWeek: string | null
  predictedDonationReferrals: number | null
  predictedEngagementRate: number | null
  predictionTimestamp: string | null
}
