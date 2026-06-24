import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

export interface Customer {
  id: number | string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  gender?: string;
  points?: number;
  source?: string;
  loyalty_card_number?: string;
  created_at?: string;
  last_sale?: string;
  [k: string]: unknown;
}

interface CustomerListResponse {
  customers: Customer[];
  count: number;
}

/** GET /customers/?page=&limit=&name= — paginated list (carried over). */
export function useCustomers(page: number, limit: number, name: string) {
  return useQuery({
    queryKey: ["customers", page, limit, name],
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const filters = name ? `&name=${encodeURIComponent(name)}` : "";
      return api.get<CustomerListResponse>(`/customers/?page=${page}&limit=${limit}${filters}`);
    },
  });
}
