import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

export interface ItemKitItem {
  itemId: number;
  quantity: number | string;
  item?: { name?: string };
}
export interface ItemKitRow {
  itemKitId: number;
  itemkit?: {
    itemKitId?: number;
    name?: string;
    categoryId?: number;
    description?: string;
    costPrice?: number | string;
    unitPrice?: number | string;
    itemkitItems?: ItemKitItem[];
  };
  [k: string]: unknown;
}
interface ItemKitListResponse {
  itemkits: ItemKitRow[];
  count: number;
}

export function useItemKits(page: number, limit: number, name: string) {
  return useQuery({
    queryKey: ["item-kits", page, limit, name],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = name ? `&name=${encodeURIComponent(name)}` : "";
      return api.get<ItemKitListResponse>(`/itemkits?page=${page}&limit=${limit}${filters}`);
    },
  });
}

/** GET /itemkits/:id — full kit (items + fields) for the editor. */
export function useItemKitDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["item-kit", id],
    enabled: isApiConfigured() && id != null && enabled,
    queryFn: () => api.get<{ itemkit: NonNullable<ItemKitRow["itemkit"]> }>(`/itemkits/${id}`),
  });
}

/** selectedItems is a map keyed by itemId; the API only reads itemId + quantity. */
export interface KitLine { itemId: number; name: string; quantity: number; }
export interface ItemKitInput {
  name: string;
  description: string;
  categoryId: number;
  price: number;          // tax-inclusive; used for both cost + unit
  lines: KitLine[];
}
function buildPayload(input: ItemKitInput) {
  const selectedItems: Record<string, { itemId: number; quantity: number }> = {};
  for (const l of input.lines) selectedItems[String(l.itemId)] = { itemId: l.itemId, quantity: l.quantity };
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    taxIncluded: true,
    onwardsPricing: false,
    costPrice: input.price,
    unitPrice: input.price,
    categoryId: input.categoryId,
    selectedItems,
  };
}
export function useCreateItemKit() {
  return useMutation({ mutationFn: (input: ItemKitInput) => api.post(`/itemkits`, buildPayload(input)) });
}
export function useUpdateItemKit() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ItemKitInput }) => api.patch(`/itemkits/${id}`, buildPayload(input)),
  });
}

export const kitName = (k: ItemKitRow) => k.itemkit?.name ?? "—";
export const kitCost = (k: ItemKitRow) => Number(k.itemkit?.costPrice ?? 0);
export const kitPrice = (k: ItemKitRow) => Number(k.itemkit?.unitPrice ?? 0);
