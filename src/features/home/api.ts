import { useQuery } from "@tanstack/react-query";
import { startOfDay, endOfDay } from "date-fns";
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

/**
 * Account subscription status, derived from /sales/dashboard's accountValidity.
 * Mirrors the legacy Dashboard logic: expired (past), expiring soon (≤30 days),
 * else valid. Reuses today's dashboard query so it dedupes with the home tiles.
 */
export interface SubscriptionStatus {
  date: Date | null;
  formatted: string;
  expired: boolean;
  expiringSoon: boolean;
  daysLeft: number | null;
}
export function useSubscription(): SubscriptionStatus {
  const now = new Date();
  const { data } = useDashboardSales(startOfDay(now).toISOString(), endOfDay(now).toISOString());
  const raw = data?.accountValidity;
  const date = raw ? new Date(raw) : null;
  if (!date || isNaN(date.getTime())) return { date: null, formatted: "", expired: false, expiringSoon: false, daysLeft: null };
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const daysLeft = Math.ceil((date.getTime() - startOfToday.getTime()) / 86400000);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return {
    date,
    formatted: `${dd}-${mm}-${date.getFullYear()}`,
    expired: daysLeft < 0,
    expiringSoon: daysLeft >= 0 && daysLeft <= 30,
    daysLeft,
  };
}

export function useSummaryGraph(start: string, end: string) {
  return useQuery({
    queryKey: ["summary-graph", start, end],
    queryFn: () => api.get<SummaryGraphPoint[]>(`/sales/summary-graph?${qs(start, end)}`),
    enabled: isApiConfigured(),
  });
}
