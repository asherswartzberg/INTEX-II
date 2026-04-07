import type { SocialMediaRecommendation } from "../types/SocialMediaRecommendation";
import { apiRequest } from "./client";

const ROOT = "/api/SocialMediaRecommendations";

export function fetchSocialMediaRecommendations(signal?: AbortSignal) {
  return apiRequest<SocialMediaRecommendation[]>(ROOT, { method: "GET", signal });
}
