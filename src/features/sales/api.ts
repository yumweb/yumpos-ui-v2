import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** A search result row (service item or item kit). Loose by design — the
 *  backend shape is carried over from /items/search; we read what we use. */
export interface SearchItem {
  id: number | string;
  name: string;
  category?: string | { name?: string };
  price?: number;
  unit_price?: number;
  type?: "item" | "itemkit";
}

interface ItemSearchResponse {
  items?: { locationItem?: SearchItem[] };
  itemKits?: { locationItemKit?: SearchItem[] };
}

export const itemPrice = (i: SearchItem): number =>
  Number(i.price ?? i.unit_price ?? 0) || 0;

export const categoryName = (i: SearchItem): string =>
  typeof i.category === "string" ? i.category : i.category?.name ?? "";

/** GET /items/search?keyword= — combines items + item kits, as the existing app does. */
export function useItemSearch(keyword: string) {
  return useQuery({
    queryKey: ["item-search", keyword],
    enabled: isApiConfigured() && keyword.trim().length > 0,
    queryFn: async () => {
      const res = await api.get<ItemSearchResponse>(
        `/items/search?keyword=${encodeURIComponent(keyword.trim())}`
      );
      return [
        ...(res.items?.locationItem ?? []),
        ...(res.itemKits?.locationItemKit ?? []),
      ];
    },
  });
}

export interface Customer {
  id: number | string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  [k: string]: unknown;
}

/** GET /customers/search/?phone= — fires once a full number is entered. */
export function useCustomerByPhone(phone: string) {
  return useQuery({
    queryKey: ["customer-phone", phone],
    enabled: isApiConfigured() && phone.replace(/\D/g, "").length >= 10,
    retry: false,
    queryFn: () => api.get<Customer>(`/customers/search/?phone=${encodeURIComponent(phone)}`),
  });
}

/** POST /sales — first-cut wiring. Payload mapping is intentionally minimal and
 *  must be reconciled with the backend DTO + the original Sales.js builder. */
export function useCreateSale() {
  return useMutation({
    mutationFn: (payload: unknown) => api.post<{ id: number | string }>(`/sales`, payload),
  });
}
