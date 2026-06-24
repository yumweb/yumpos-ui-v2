import { useQuery } from "@tanstack/react-query";
import { api, isApiConfigured } from "@/lib/apiClient";

/** Real response of /sales/dashboard (see yumpos-ui Dashboard SnapShot). */
export interface DashboardSales {
  total_sales: number;
  male_total: number;
  female_total: number;
  total_payment: number;
  scheduled_appointments: number;
  completed_appointments: number;
  accountValidity?: string;
}

export interface SummaryGraphPoint {
  date?: string;
  label?: string;
  total: number;
}

const qs = (start: string, end: string) => `startDate=${start}&endDate=${end}`;

export function useDashboardSales(start: string, end: string) {
  return useQuery({
    queryKey: ["dashboard-sales", start, end],
    queryFn: () => api.get<DashboardSales>(`/sales/dashboard?${qs(start, end)}`),
    enabled: isApiConfigured(),
  });
}

export function useSummaryGraph(start: string, end: string) {
  return useQuery({
    queryKey: ["summary-graph", start, end],
    queryFn: () => api.get<SummaryGraphPoint[]>(`/sales/summary-graph?${qs(start, end)}`),
    enabled: isApiConfigured(),
  });
}
