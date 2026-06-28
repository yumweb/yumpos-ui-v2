import { useQuery, useMutation } from "@tanstack/react-query";
import { api, isApiConfigured, ApiError } from "@/lib/apiClient";
import type { BadgeTone } from "@/components/ui/primitives";

interface RawAppointment {
  id: number;
  appointmentTime: string;
  sale?: {
    id?: number;
    suspended?: number;
    customer?: { firstName?: string; lastName?: string; phoneNumber?: string };
  };
}

export interface Appointment {
  appointmentId: number;
  saleId: number | null;
  time: string;           // ISO
  suspended: number;
  customerName: string;
  phone: string;
}

export function useAppointments(startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["appointments", startISO, endISO],
    enabled: isApiConfigured(),
    queryFn: async () => {
      const res = await api.get<RawAppointment[] | { data?: RawAppointment[]; appointments?: RawAppointment[] }>(
        `/appointments?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`
      );
      const arr = Array.isArray(res) ? res : res.data ?? res.appointments ?? [];
      return arr
        .filter((a) => a.appointmentTime)
        .map((a): Appointment => ({
          appointmentId: a.id,
          saleId: a.sale?.id ?? null,
          time: a.appointmentTime,
          suspended: Number(a.sale?.suspended ?? 3),
          customerName: [a.sale?.customer?.firstName, a.sale?.customer?.lastName].filter(Boolean).join(" ").trim() || "—",
          phone: a.sale?.customer?.phoneNumber ?? "",
        }))
        .sort((x, y) => new Date(x.time).getTime() - new Date(y.time).getTime());
    },
  });
}

export interface ApptStatus { label: string; tone: BadgeTone; }
/** Status derived from sale.suspended + whether the slot is in the past. */
export function appointmentStatus(suspended: number, time: string): ApptStatus {
  const past = new Date(time).getTime() < Date.now();
  if (suspended === 0) return { label: "Completed", tone: "ok" };
  if (suspended === 1) return { label: "In Progress", tone: "warn" };
  if (suspended === 3 && past) return { label: "No Show", tone: "danger" };
  return { label: "Scheduled", tone: "brand" };
}

/* ---- Detail: the sale receipt behind an appointment ---- */
export interface SaleItemLine { id?: number; item?: { name?: string; categoryId?: number }; serviceEmployee?: { firstName?: string } }
export interface SaleKitLine {
  id?: number;
  itemkit?: { name?: string; categoryId?: number };
  saleItemkitItems?: Array<{ id?: number; item?: { name?: string }; kitsServiceEmployeePerson?: { firstName?: string } }>;
}
export interface SaleReceipt {
  id?: number;
  suspended?: number;
  customer?: { firstName?: string; lastName?: string; phoneNumber?: string };
  saleItems?: SaleItemLine[];
  saleItemkit?: SaleKitLine[];
  [k: string]: unknown;
}
export function useSaleReceipt(saleId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["sale-receipt", saleId],
    enabled: isApiConfigured() && saleId != null && enabled,
    queryFn: () => api.get<SaleReceipt>(`/sales/receipt/${saleId}`),
  });
}

export function useDeleteAppointment() {
  return useMutation({
    mutationFn: async (appointmentId: number) => {
      try {
        await api.delete(`/appointments/${appointmentId}`);
      } catch (e) {
        if (e instanceof ApiError && e.status >= 400) throw e; // tolerate empty 200 body
      }
    },
  });
}
