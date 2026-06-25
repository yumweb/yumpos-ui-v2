import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

export interface Supplier {
  id: number;
  companyName?: string;
  accountNumber?: string | null;
  person?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  };
  [k: string]: unknown;
}
interface SupplierListResponse {
  data: Supplier[];
  count: number;
}

/**
 * Load every supplier once and filter client-side.
 * The backend /suppliers/search endpoint is broken (returns nothing), and the
 * dataset is small (~170), so we fetch the full list and search in the browser.
 */
export function useAllSuppliers() {
  return useQuery({
    queryKey: ["suppliers-all"],
    enabled: isApiConfigured(),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: () => api.get<SupplierListResponse>(`/suppliers?page=1&limit=1000`),
  });
}

export function matchesSupplier(s: Supplier, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [s.companyName, s.person?.firstName, s.person?.lastName, s.person?.phoneNumber, s.person?.email]
    .filter(Boolean).join(" ").toLowerCase();
  return hay.includes(needle);
}

/* ---- Create supplier (POST /suppliers) ---- */
export interface NewSupplierInput {
  companyName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  comments?: string;
}
export function useCreateSupplier() {
  return useMutation({
    mutationFn: (input: NewSupplierInput) => {
      const t = (v?: string) => v?.trim() ?? "";
      return api.post(`/suppliers`, {
        companyName: input.companyName.trim(),
        firstName: t(input.firstName),
        lastName: t(input.lastName),
        phoneNumber: t(input.phoneNumber),
        ...(input.email?.trim() ? { email: input.email.trim() } : {}),
        address1: t(input.address1),
        address2: t(input.address2),
        city: t(input.city),
        state: t(input.state),
        zipCode: t(input.zipCode),
        country: t(input.country),
        comments: t(input.comments),
      });
    },
  });
}

export const supplierName = (s: Supplier) =>
  [s.person?.firstName, s.person?.lastName].filter(Boolean).join(" ").trim() || "—";
