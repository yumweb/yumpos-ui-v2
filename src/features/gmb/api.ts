import { useQuery } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";
import { getLocation } from "@/lib/auth";

const loc = () => Number(getLocation()?.locationId);

/* ---- Connection + mapping ---- */
export interface GmbStatus { connected: boolean; email?: string; mapped?: boolean }
export interface GmbMapping { mapped: boolean; averageRatingStart?: number; totalReviewCountStart?: number; refreshInProgress?: boolean }

export function useGmbStatus() {
  return useQuery({
    queryKey: ["gmb-status", loc()],
    enabled: isApiConfigured(),
    queryFn: () => api.get<GmbStatus>(`/gmb/${loc()}/status`),
  });
}
export function useGmbMapping(enabled: boolean) {
  return useQuery({
    queryKey: ["gmb-mapping", loc()],
    enabled: isApiConfigured() && enabled,
    queryFn: () => api.get<GmbMapping>(`/gmb/${loc()}`),
  });
}
export const getGmbAuthUrl = () => api.get<{ url: string }>(`/gmb/${loc()}/auth-url`);
/** OAuth callback exchange — locationId comes from the `state` query param. */
export const connectGmb = (locationId: number, code: string) => api.post(`/gmb/${locationId}/connect`, { code });
export const disconnectGmb = () => api.delete(`/gmb/${loc()}/map`);
export const logoutGmbAccount = () => api.delete(`/gmb/${loc()}/account`);

export interface GbpAccount { name: string; accountName?: string }
export interface GbpLocation { name: string; title?: string; storefrontAddress?: { addressLines?: string[] }; metadata?: { mapsUri?: string; placeId?: string } }
export const getGmbAccounts = () => api.get<GbpAccount[]>(`/gmb/${loc()}/accounts`);
export const getGmbAccountLocations = (accountId: string) => api.get<GbpLocation[]>(`/gmb/${loc()}/accounts/${accountId}/locations`);
export const mapGmbLocation = (body: { gbpAccountId: string; gbpLocationId: string; gmapsUri?: string; placeId?: string }) =>
  api.post<GmbMapping>(`/gmb/${loc()}/map`, body);

/* ---- Reviews ---- */
export interface GmbReview {
  reviewId: string;
  reviewerDisplayName?: string;
  reviewerProfilePhotoUrl?: string;
  createTime?: string;
  starRating?: number;
  comment?: string;
  reviewReplyComment?: string;
  reviewReplyUpdateTime?: string;
  repliedByAi?: boolean;
}
export function useGmbReviews(page: number, limit: number, enabled: boolean) {
  return useQuery({
    queryKey: ["gmb-reviews", loc(), page, limit],
    enabled: isApiConfigured() && enabled,
    queryFn: async () => {
      const r = await api.get<{ reviews?: GmbReview[]; total?: number; count?: number }>(`/gmb/${loc()}/reviews?page=${page}&limit=${limit}`);
      return { reviews: r.reviews ?? [], total: r.total ?? r.count ?? 0 };
    },
  });
}
export const syncGmbReviews = () => api.post<{ started?: boolean; message?: string; count?: number }>(`/gmb/${loc()}/reviews/sync`);
export const replyGmbReview = (reviewId: string, comment: string) => api.put(`/gmb/${loc()}/reviews/${reviewId}/reply`, { comment });
export const deleteGmbReply = (reviewId: string) => api.delete(`/gmb/${loc()}/reviews/${reviewId}/reply`);
export const aiReplyGmbReview = (reviewId: string) => api.post<{ reply: string }>(`/gmb/${loc()}/reviews/${reviewId}/ai-reply`);
export const bulkAiReplyGmb = () => api.post<{ started?: boolean; message?: string }>(`/gmb/${loc()}/reviews/bulk-ai-reply`);

/* ---- Performance ---- */
export const PERFORMANCE_METRICS = [
  { value: "WEBSITE_CLICKS", label: "Website clicks" },
  { value: "CALL_CLICKS", label: "Calls" },
  { value: "BUSINESS_DIRECTION_REQUESTS", label: "Direction requests" },
  { value: "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", label: "Impressions (Maps, desktop)" },
  { value: "BUSINESS_IMPRESSIONS_MOBILE_MAPS", label: "Impressions (Maps, mobile)" },
];
export interface PerfPoint { date: string; value: number }
export function useGmbPerformance(metric: string, start: string, end: string, enabled: boolean) {
  return useQuery({
    queryKey: ["gmb-perf", loc(), metric, start, end],
    enabled: isApiConfigured() && enabled,
    queryFn: async () => {
      const r = await api.get<PerfPoint[] | { data?: PerfPoint[] }>(`/gmb/${loc()}/performance?metric=${metric}&start=${start}&end=${end}`);
      return Array.isArray(r) ? r : r.data ?? [];
    },
  });
}

/* ---- Posts & media ---- */
export interface GmbPost { name: string; summary?: string; state?: string; createTime?: string }
export interface GmbMedia { name: string; thumbnailUrl?: string; googleUrl?: string }
export function useGmbPosts(enabled: boolean) {
  return useQuery({
    queryKey: ["gmb-posts", loc()],
    enabled: isApiConfigured() && enabled,
    queryFn: async () => {
      const r = await api.get<GmbPost[] | { posts?: GmbPost[] }>(`/gmb/${loc()}/posts`);
      return Array.isArray(r) ? r : r.posts ?? [];
    },
  });
}
export interface NewGmbPostMedia { mediaFormat: "PHOTO" | "VIDEO"; sourceUrl: string }
export const createGmbPost = (body: { languageCode: string; summary: string; topicType: string; media?: NewGmbPostMedia[] }) =>
  api.post(`/gmb/${loc()}/posts`, body);
export const deleteGmbPost = (name: string) => api.delete(`/gmb/${loc()}/posts?name=${encodeURIComponent(name)}`);

/** Image upload uses multipart/form-data — bypass the JSON apiClient. */
export async function uploadGmbImage(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/gmb/${loc()}/upload-image`, {
    method: "POST",
    headers: {
      "x-api-key": import.meta.env.VITE_API_KEY ?? "",
      authorization: `Bearer ${localStorage.getItem("yumpos_token") ?? ""}`,
      accept: "application/json",
    },
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
}
