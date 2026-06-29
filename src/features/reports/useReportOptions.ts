import { useQuery } from "@tanstack/react-query";
import { isApiConfigured } from "@/lib/apiClient";
import { useEmployees } from "@/features/employees/api";
import { useAllSuppliers } from "@/features/suppliers/api";
import { useCategoryTree, flattenCategories } from "@/features/retail/api";
import { getItemOptions } from "./api";
import type { OptionSource, ParamOption } from "./types";

/**
 * Resolve dynamic select options from existing app APIs. All hooks run but only
 * the one matching `source` is enabled, so unused sources don't fetch.
 */
export function useOptionSource(source?: OptionSource): { options: ParamOption[]; loading: boolean } {
  const employees = useEmployees();
  const suppliers = useAllSuppliers();
  const categories = useCategoryTree();
  const items = useQuery({
    queryKey: ["report-item-options"],
    enabled: isApiConfigured() && source === "items",
    staleTime: 30 * 60 * 1000,
    queryFn: getItemOptions,
  });

  if (source === "employees") {
    return {
      loading: employees.isLoading,
      options: (employees.data ?? []).map((e) => ({ value: e.personId, label: `${e.firstName} ${e.lastName}`.trim() || e.username || `#${e.personId}` })),
    };
  }
  if (source === "suppliers") {
    return {
      loading: suppliers.isLoading,
      options: (suppliers.data?.data ?? []).map((s) => ({ value: s.id, label: s.companyName || `${s.person?.firstName ?? ""} ${s.person?.lastName ?? ""}`.trim() || `#${s.id}` })),
    };
  }
  if (source === "categories") {
    return { loading: categories.isLoading, options: flattenCategories(categories.data ?? []).map((c) => ({ value: c.id, label: c.label })) };
  }
  if (source === "items") {
    return { loading: items.isLoading, options: (items.data ?? []).map((i) => ({ value: i.id, label: i.name })) };
  }
  return { options: [], loading: false };
}
