import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

export interface FamilyCardPerson {
  id?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}
export interface FamilyCardLog {
  logDate?: string;
  logMessage?: string;
}
/** GET /familycards row shape (verified against the live API). */
export interface FamilyCard {
  id: number;
  familycardNumber: string;
  description?: string;
  value?: string;          // original loaded value (CRA shows this as "Balance")
  balance?: number;        // remaining balance (separate field)
  validityDate?: string;
  inactive?: boolean;
  deleted?: boolean;
  customerId?: number;
  locationId?: number;
  person?: FamilyCardPerson;
  familycardLogs?: FamilyCardLog[];
  [k: string]: unknown;
}

interface FamilyCardListResponse {
  familycards: FamilyCard[];
  count: number;
}

export function useFamilyCards(page: number, limit: number, number: string) {
  return useQuery({
    queryKey: ["family-cards", page, limit, number],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = number ? `&number=${encodeURIComponent(number)}` : "";
      return api.get<FamilyCardListResponse>(`/familycards?page=${page}&limit=${limit}${filters}`);
    },
  });
}

/* ---- Customer autocomplete (assign a card holder) ---- */
export interface CustomerHit {
  personId: number;
  name: string;
  phone: string;
}
interface RawCustomer {
  personId?: number;
  person?: { id?: number; firstName?: string; lastName?: string; phoneNumber?: string };
}
export function useCustomerSearch(name: string) {
  return useQuery({
    queryKey: ["fc-customer-search", name],
    enabled: isApiConfigured() && name.trim().length >= 1,
    queryFn: async () => {
      const res = await api.get<{ customers?: RawCustomer[] }>(
        `/customers/?page=1&limit=5&name=${encodeURIComponent(name.trim())}`
      );
      return (res.customers ?? []).map((c): CustomerHit => ({
        personId: (c.person?.id ?? c.personId)!,
        name: [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ").trim() || "—",
        phone: c.person?.phoneNumber ?? "",
      }));
    },
  });
}

/* ---- Update family card (PATCH /familycards/:id) ---- */
export interface FamilyCardUpdateInput {
  familycardNumber: string;
  description: string;
  validityDate: string;   // YYYY-MM-DD
  inactive: boolean;
  customerId?: number;
}
export function useUpdateFamilyCard() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: FamilyCardUpdateInput }) =>
      api.patch(`/familycards/${id}`, {
        familycardNumber: input.familycardNumber.trim(),
        description: input.description.trim(),
        validityDate: input.validityDate,
        inactive: input.inactive,
        ...(input.customerId ? { customerId: input.customerId } : {}),
      }),
  });
}

export const fcCustomerName = (c: FamilyCard) =>
  [c.person?.firstName, c.person?.lastName].filter(Boolean).join(" ").trim() || "NA";
