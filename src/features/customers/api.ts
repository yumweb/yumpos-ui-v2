import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Real /customers/ shape: name + phone are nested under `person`. */
export interface Person {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}
export interface Customer {
  id?: number | string;
  personId?: number | string;
  person?: Person;
  loyaltyCardNumber?: string;
  sourceId?: number | string;
  gender?: string | number;
  points?: number | string;
  createdDate?: string;
  [k: string]: unknown;
}

interface CustomerListResponse {
  customers: Customer[];
  count: number;
}

export function useCustomers(
  page: number,
  limit: number,
  name: string,
  source = "",
  gender = ""
) {
  return useQuery({
    queryKey: ["customers", page, limit, name, source, gender],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let filters = "";
      if (name) filters += `&name=${encodeURIComponent(name)}`;
      if (source) filters += `&source=${encodeURIComponent(source)}`;
      if (gender) filters += `&gender=${encodeURIComponent(gender)}`;
      const res = await api.get<CustomerListResponse>(`/customers/?page=${page}&limit=${limit}${filters}`);
      // latest created first
      const customers = [...(res.customers ?? [])].sort(
        (a, b) => new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime()
      );
      return { ...res, customers };
    },
  });
}

export interface LeadSource {
  id: number | string;
  source: string;
}

/** GET /leads/sources — to map a customer's sourceId to its name. */
export function useLeadSources() {
  return useQuery({
    queryKey: ["lead-sources"],
    enabled: isApiConfigured(),
    staleTime: 60 * 60 * 1000,
    queryFn: () => api.get<LeadSource[]>("/leads/sources"),
  });
}
