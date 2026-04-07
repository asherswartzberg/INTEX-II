import type { SocialMediaPost } from "../types/SocialMediaPost";
import { apiRequest, type QueryParams } from "./client";

const ROOT = "/api/SocialMediaPosts";

export type SocialMediaPostsListParams = {
  platform?: string;
  page?: number;
  pageSize?: number;
};

export function fetchSocialMediaPosts(
  params?: SocialMediaPostsListParams,
  signal?: AbortSignal,
) {
  const query: QueryParams = {
    platform: params?.platform,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  return apiRequest<SocialMediaPost[]>(ROOT, { method: "GET", query, signal });
}

export function fetchSocialMediaPostById(id: number, signal?: AbortSignal) {
  return apiRequest<SocialMediaPost>(`${ROOT}/${id}`, { method: "GET", signal });
}
