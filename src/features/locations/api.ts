import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Real store configuration lives on the location entity. */
export interface Location {
  locationId: number;
  name?: string;
  address?: string;
  area?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  taxName1?: string;
  taxRate1?: string;
  taxName2?: string;
  taxRate2?: string;
  serviceTaxNumber?: string;
  storeCode?: string;
  ownerName?: string;
  ownerContact?: string;
  ownerEmail?: string;
  [k: string]: unknown;
}

export function useAllLocations() {
  return useQuery({
    queryKey: ["all-locations"],
    enabled: isApiConfigured(),
    queryFn: async () => {
      const res = await api.get<Location[] | { data?: Location[]; locations?: Location[] }>(`/locations/all`);
      return Array.isArray(res) ? res : res.data ?? res.locations ?? [];
    },
  });
}

/** Full location config for the editor (GET /locations/:id). */
export function useLocationDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["location-detail", id],
    enabled: isApiConfigured() && id != null && enabled,
    queryFn: () => api.get<Location>(`/locations/${id}`),
  });
}

/** PATCH /locations/:id accepts any partial body — send only changed fields. */
export function useUpdateLocation() {
  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Record<string, unknown> }) =>
      api.patch(`/locations/${id}`, fields),
  });
}
