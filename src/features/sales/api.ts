import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Normalized item used by the POS. */
export interface PosItem {
  id: number | string;
  name: string;
  price: number;
  category: string;
  categoryParentId?: number | string;
  isService: boolean;
  stock: number;
}

/** Raw /items/search row: a flat array of location-items, name/price nested in `item`. */
interface RawLocationItem {
  itemId?: number | string;
  unitPrice?: number | string | null;
  promoPrice?: number | string | null;
  quantity?: number | string | null;
  item?: {
    itemId?: number | string;
    name?: string;
    isService?: boolean;
    unitPrice?: number | string | null;
    promoPrice?: number | string | null;
    category?: { name?: string; parentId?: number | string } | null;
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
    categoryParentId: it.category?.parentId ?? undefined,
    isService: Boolean(it.isService),
    stock: Number(r.quantity ?? 0) || 0,
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

interface CategoryName {
  id: number | string;
  name: string;
}

/** GET /categories/names → id→name map, to resolve a category's parent label. */
export function useCategoryNames() {
  return useQuery({
    queryKey: ["category-names"],
    enabled: isApiConfigured(),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get<CategoryName[] | { categories?: CategoryName[] }>("/categories/names");
      const arr = Array.isArray(res) ? res : res.categories ?? [];
      const map = new Map<string, string>();
      arr.forEach((c) => map.set(String(c.id), c.name));
      return map;
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
