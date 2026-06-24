import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Loose shape — the legacy page remaps fields, so read defensively. */
export interface Lead {
  id: number | string;
  [k: string]: unknown;
}
interface LeadListResponse {
  leads: Lead[];
  count: number;
}

export function useLeads(page: number, limit: number, name: string) {
  return useQuery({
    queryKey: ["leads", page, limit, name],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = name ? `&name=${encodeURIComponent(name)}` : "";
      return api.get<LeadListResponse>(`/leads/?page=${page}&limit=${limit}${filters}`);
    },
  });
}

/** Read the first present key from a loose record. */
export const pick = (o: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== "") return String(v);
  }
  return "";
};
