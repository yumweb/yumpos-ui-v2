import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CalendarClock, Play } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Badge } from "@/components/ui/primitives";
import { useCategoryNames } from "@/features/sales/api";
import { useSaleReceipt, useDeleteAppointment, appointmentStatus, type Appointment } from "./api";

const fullDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export function AppointmentDetailModal({ appointment, onClose, onCancelled }: {
  appointment: Appointment | null;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const open = !!appointment;
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const { data: receipt, isLoading } = useSaleReceipt(appointment?.saleId ?? null, open);
  const { data: catNames } = useCategoryNames();
  const del = useDeleteAppointment();
  const catLabel = (id?: number) => (id != null ? catNames?.get(String(id)) ?? String(id) : "—");

  if (!appointment) return null;
  const st = appointmentStatus(appointment.suspended, appointment.time);
  const completed = appointment.suspended === 0;

  const saleItems = receipt?.saleItems ?? [];
  const kits = receipt?.saleItemkit ?? [];
  const hasRows = saleItems.length > 0 || kits.length > 0;

  function cancelAppointment() {
    del.mutate(appointment!.appointmentId, {
      onSuccess: () => { onCancelled(); onClose(); },
    });
  }

  const go = (path: string) => { navigate(path); onClose(); };

  return (
    <Modal open={open} onClose={onClose} title="Appointment" width="max-w-[600px]">
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold">{appointment.customerName}</p>
            {appointment.phone && <p className="text-sm tnum text-ink-3">{appointment.phone}</p>}
            <p className="mt-1 text-sm text-ink-2">{fullDate(appointment.time)} · {timeLabel(appointment.time)}</p>
          </div>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13.5px]">
            <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
              <tr><th className="px-3 py-2 font-semibold">Service</th><th className="px-3 py-2 font-semibold">Category</th><th className="px-3 py-2 font-semibold">Technician</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="px-3 py-5 text-center text-ink-3">Loading…</td></tr>
              ) : !hasRows ? (
                <tr><td colSpan={3} className="px-3 py-5 text-center text-ink-3">No services set.</td></tr>
              ) : (
                <>
                  {saleItems.map((s, i) => (
                    <tr key={`it-${s.id ?? i}`} className="border-t border-border">
                      <td className="px-3 py-2">{s.item?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-ink-3">{catLabel(s.item?.categoryId)}</td>
                      <td className="px-3 py-2">{s.serviceEmployee?.firstName ?? "Not set"}</td>
                    </tr>
                  ))}
                  {kits.map((k, i) => (
                    <tr key={`kit-${k.id ?? i}`} className="border-t border-border align-top">
                      <td className="px-3 py-2">
                        <div className="font-semibold">{k.itemkit?.name ?? "Kit"}</div>
                        {(k.saleItemkitItems ?? []).map((ki, j) => <div key={j} className="text-ink-2">{ki.item?.name ?? "—"}</div>)}
                      </td>
                      <td className="px-3 py-2 text-ink-3">{catLabel(k.itemkit?.categoryId)}</td>
                      <td className="px-3 py-2">
                        {(k.saleItemkitItems ?? []).map((ki, j) => <div key={j}>{ki.kitsServiceEmployeePerson?.firstName ?? "Not set"}</div>)}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {!completed && (
          <>
            {confirming ? (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="mb-2 text-sm font-medium">Cancel this appointment? This cannot be undone.</p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="default" onClick={() => setConfirming(false)}>Keep</Button>
                  <Button type="button" variant="danger" onClick={cancelAppointment} disabled={del.isPending}>
                    {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cancel appointment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="default" onClick={() => setConfirming(true)}>Cancel appointment</Button>
                <Button type="button" variant="default"
                  onClick={() => go(`/sales?sale=changeAppointment&saleId=${appointment.saleId}&appointmentId=${appointment.appointmentId}&appointmentTime=${encodeURIComponent(appointment.time)}`)}>
                  <CalendarClock className="h-4 w-4" /> Change
                </Button>
                <Button type="button" variant="primary" onClick={() => go(`/sales?sale=complete&saleId=${appointment.saleId}`)}>
                  <Play className="h-4 w-4" /> Start Sale
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
