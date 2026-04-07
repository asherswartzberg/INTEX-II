/** Table `social_media_recommendations` — ML posting strategy predictions */
export interface SocialMediaRecommendation {
  platform: string | null
  postType: string | null
  mediaType: string | null
  contentTopic: string | null
  sentimentTone: string | null
  dayOfWeek: string | null
  postHour: number | null
  hasCallToAction: boolean | null
  isBoosted: boolean | null
  numHashtags: number | null
  captionLength: number | null
  featuresResidentStory: boolean | null
  mentionsCount: number | null
  boostBudgetPhp: number | null
  predictedDonationReferrals: number | null
  predictionTimestamp: string | null
}
