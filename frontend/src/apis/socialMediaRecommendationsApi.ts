import type { SocialMediaRecommendation } from "../types/SocialMediaRecommendation";
import { apiRequest } from "./client";

const ROOT = "/api/SocialMediaRecommendations";

export interface SocialMediaRecommendationFilters {
  platform?: string
  postType?: string
  contentTopic?: string
  mediaType?: string
  dayOfWeek?: string
  top?: number
}

export function fetchSocialMediaRecommendations(
  filters?: SocialMediaRecommendationFilters,
  signal?: AbortSignal,
) {
  return apiRequest<SocialMediaRecommendation[]>(ROOT, {
    method: "GET",
    query: filters as Record<string, string | number | undefined>,
    signal,
  });
}
