import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

export interface RetailItem {
  itemId: number;
  quantity?: number | null;
  item?: {
    name?: string;
    size?: string;
    costPrice?: number | string;
    unitPrice?: number | string;
    category?: { id?: number; name?: string } | null;
  };
  [k: string]: unknown;
}
interface RetailListResponse {
  items: RetailItem[];
  count: number;
}

/** GET /items?isService=false — the Retail Products catalog. */
export function useRetailProducts(page: number, limit: number, name: string, category: string) {
  return useQuery({
    queryKey: ["retail-products", page, limit, name, category],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      let filters = "";
      if (name) filters += `&name=${encodeURIComponent(name)}`;
      if (category) filters += `&category=${encodeURIComponent(category)}`;
      return api.get<RetailListResponse>(`/items?page=${page}&limit=${limit}&isService=false${filters}`);
    },
  });
}

/* ---- Category tree (for the filter) ---- */
export interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}
export interface FlatCategory {
  id: number;
  label: string; // indented by depth
}

/** Depth-first flatten with non-breaking-space indentation, like the CRA select. */
export function flattenCategories(nodes: CategoryNode[] = [], depth = 0): FlatCategory[] {
  const pad = " ".repeat(depth * 3);
  return nodes.flatMap((n) => [
    { id: n.id, label: `${pad}${n.name}` },
    ...flattenCategories(n.children ?? [], depth + 1),
  ]);
}

export function useCategoryTree() {
  return useQuery({
    queryKey: ["category-tree"],
    enabled: isApiConfigured(),
    staleTime: 60 * 60 * 1000,
    queryFn: () => api.get<CategoryNode[]>("/categories"),
  });
}

export const retailName = (r: RetailItem) => r.item?.name ?? "—";
export const retailCategory = (r: RetailItem) => r.item?.category?.name || "Uncategorized";
export const retailCost = (r: RetailItem) => Number(r.item?.costPrice ?? 0);
export const retailPrice = (r: RetailItem) => Number(r.item?.unitPrice ?? 0);
