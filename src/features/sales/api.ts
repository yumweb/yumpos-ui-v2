import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Normalized item used by the POS. */
export interface PosItem {
  id: number | string;
  name: string;
  price: number;
  category: string;
  isService: boolean;
}

/** Raw /items/search row: a flat array of location-items, name/price nested in `item`. */
interface RawLocationItem {
  itemId?: number | string;
  unitPrice?: number | string | null;
  promoPrice?: number | string | null;
  item?: {
    itemId?: number | string;
    name?: string;
    isService?: boolean;
    unitPrice?: number | string | null;
    promoPrice?: number | string | null;
    category?: { name?: string } | null;
  };
}

function normalize(r: RawLocationItem): PosItem {
  const it = r.item ?? {};
  const price =
    [r.promoPrice, r.unitPrice, it.promoPrice, it.unitPrice]
      .map((v) => Number(v))
      .find((n) => Number.isFinite(n) && n > 0) ?? 0;
  return {
    id: (r.itemId ?? it.itemId)!,
    name: it.name ?? "Item",
    price,
    category: it.category?.name ?? "",
    isService: Boolean(it.isService),
  };
}

/** GET /items/search?keyword= → flat array, normalized to PosItem. */
export function useItemSearch(keyword: string) {
  return useQuery({
    queryKey: ["item-search", keyword],
    enabled: isApiConfigured() && keyword.trim().length > 0,
    queryFn: async () => {
      const rows = await api.get<RawLocationItem[]>(
        `/items/search?keyword=${encodeURIComponent(keyword.trim())}`
      );
      return (Array.isArray(rows) ? rows : []).map(normalize);
    },
  });
}

/** /customers/search/?phone= returns a single customer (name nested under person). */
export interface CustomerLite {
  id?: number | string;
  personId?: number | string;
  person?: { firstName?: string; lastName?: string; phoneNumber?: string };
  [k: string]: unknown;
}

export function useCustomerByPhone(phone: string) {
  return useQuery({
    queryKey: ["customer-phone", phone],
    enabled: isApiConfigured() && phone.replace(/\D/g, "").length >= 10,
    retry: false,
    queryFn: () => api.get<CustomerLite>(`/customers/search/?phone=${encodeURIComponent(phone)}`),
  });
}

export const customerName = (c?: CustomerLite | null) =>
  c ? [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ") : "";

/** POST /sales — first-cut payload, to reconcile with the backend DTO. */
export function useCreateSale() {
  return useMutation({
    mutationFn: (payload: unknown) => api.post<{ id: number | string }>(`/sales`, payload),
  });
}
