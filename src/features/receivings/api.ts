import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";
import { useAllSuppliers, matchesSupplier } from "@/features/suppliers/api";

/* ---- Supplier search (client-side over the full list; search endpoint is broken) ---- */
export interface SupplierHit {
  id: number;
  companyName: string;
  contact: string;
}
export function useSupplierMatches(query: string, limit = 15) {
  const { data } = useAllSuppliers();
  const q = query.trim();
  if (q.length < 2) return [] as SupplierHit[];
  return (data?.data ?? [])
    .filter((s) => matchesSupplier(s, q))
    .slice(0, limit)
    .map((s): SupplierHit => ({
      id: s.id,
      companyName: s.companyName || `Supplier #${s.id}`,
      contact: [s.person?.firstName, s.person?.lastName].filter(Boolean).join(" ").trim(),
    }));
}

/* ---- Item search (returns cost + unit price for the receiving line) ---- */
export interface ReceivingItemHit {
  itemId: number;
  name: string;
  costPrice: number;
  unitPrice: number;
}
interface RawSearchItem {
  itemId?: number;
  item?: { itemId?: number; name?: string; costPrice?: number | string; unitPrice?: number | string };
}
export function useReceivingItemSearch(keyword: string) {
  return useQuery({
    queryKey: ["receiving-item-search", keyword],
    enabled: isApiConfigured() && keyword.trim().length >= 2,
    queryFn: async () => {
      const rows = await api.get<RawSearchItem[]>(`/items/search?keyword=${encodeURIComponent(keyword.trim())}`);
      return (Array.isArray(rows) ? rows : []).map((r): ReceivingItemHit => ({
        itemId: (r.itemId ?? r.item?.itemId)!,
        name: r.item?.name ?? "Item",
        costPrice: Number(r.item?.costPrice) || 0,
        unitPrice: Number(r.item?.unitPrice) || 0,
      }));
    },
  });
}

/* ---- Create receiving (POST /receivings) ---- */
export interface ReceivingLine {
  itemId: number;
  name: string;
  quantityPurchased: number;
  itemCostPrice: number;
  itemUnitPrice: number;
}
export interface CreateReceivingInput {
  supplier: number;
  comment: string;
  paymentType: string;
  lines: ReceivingLine[];
}
export function useCreateReceiving() {
  return useMutation({
    mutationFn: (input: CreateReceivingInput) =>
      api.post<{ id?: number; stockWarnings?: unknown[] }>(`/receivings`, {
        supplier: input.supplier,
        comment: input.comment,
        paymentType: input.paymentType,
        paymentAdvance: 0,
        receivingItems: input.lines.map((l, i) => ({
          itemId: l.itemId,
          line: i + 1,
          quantityPurchased: l.quantityPurchased,
          itemCostPrice: l.itemCostPrice,
          itemUnitPrice: l.itemUnitPrice,
        })),
      }),
  });
}

export const PAYMENT_TYPES = ["Cash", "Debit Card", "Credit Card", "Airtel Payments", "Paytm", "PhonePe", "Google Pay", "Bharat QR"];
