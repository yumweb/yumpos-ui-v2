import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** GET /reviews — internal customer review collection (text feedback, no rating). */
export interface Review {
  id: number;
  locationId?: number;
  phone?: string;
  review?: string;
  createdDate?: string;
  customerName?: string;
  location?: { name?: string };
  [k: string]: unknown;
}
interface ReviewListResponse { reviews: Review[]; count: number; }

export function useReviews(page: number, limit: number) {
  return useQuery({
    queryKey: ["reviews", page, limit],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => api.get<ReviewListResponse>(`/reviews?page=${page}&limit=${limit}`),
  });
}
