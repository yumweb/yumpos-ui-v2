import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

export interface ServiceItem {
  itemId: number;
  costPrice?: number | string;
  unitPrice?: number | string;
  item?: {
    itemId?: number;
    name?: string;
    size?: string;
    isService?: boolean;
    costPrice?: number | string;
    unitPrice?: number | string;
    category?: { id?: number; name?: string; parentId?: number } | null;
  };
  [k: string]: unknown;
}
interface ServiceListResponse {
  items: ServiceItem[];
  count: number;
}

/** GET /items?isService=true — the Services catalog. */
export function useServices(page: number, limit: number, name: string) {
  return useQuery({
    queryKey: ["services", page, limit, name],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = name ? `&name=${encodeURIComponent(name)}` : "";
      return api.get<ServiceListResponse>(`/items?page=${page}&limit=${limit}&isService=true${filters}`);
    },
  });
}

/* ---- Bill of materials (linked products) ---- */
export interface BomComponent {
  componentItemId: number;
  quantityPerService: number | string;
  active: boolean;
  componentItem?: { name?: string; itemId?: number };
}
export function useServiceBom(serviceItemId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["service-bom", serviceItemId],
    enabled: isApiConfigured() && serviceItemId != null && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => api.get<BomComponent[]>(`/items/${serviceItemId}/bom`),
  });
}

export interface BomUpsertRow {
  componentItemId: number;
  quantityPerService: number;
  active: boolean;
}
export function useUpsertServiceBom() {
  return useMutation({
    mutationFn: ({ serviceItemId, bom }: { serviceItemId: number; bom: BomUpsertRow[] }) =>
      api.put(`/items/${serviceItemId}/bom`, { bom }),
  });
}

export const serviceName = (s: ServiceItem) => s.item?.name ?? "—";
export const serviceCategory = (s: ServiceItem) => s.item?.category?.name || "Uncategorized";
export const serviceCost = (s: ServiceItem) => Number(s.item?.costPrice ?? s.costPrice ?? 0);
export const servicePrice = (s: ServiceItem) => Number(s.item?.unitPrice ?? s.unitPrice ?? 0);
