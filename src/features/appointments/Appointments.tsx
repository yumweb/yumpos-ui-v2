import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { Button, Badge } from "@/components/ui/primitives";
import { useAppointments, appointmentStatus, type Appointment } from "./api";
import { AppointmentDetailModal } from "./AppointmentDetailModal";

const monthLabel = (d: Date) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const dayHeader = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD local
const isToday = (iso: string) => dayKey(iso) === new Date().toLocaleDateString("en-CA");

const LEGEND: Array<{ label: string; tone: "brand" | "warn" | "ok" | "danger" }> = [
  { label: "Scheduled", tone: "brand" },
  { label: "In Progress", tone: "warn" },
  { label: "Completed", tone: "ok" },
  { label: "No Show", tone: "danger" },
];

export function Appointments() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { monthStart, startISO, endISO } = useMemo(() => {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const me = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
    return { monthStart: ms, startISO: ms.toISOString(), endISO: me.toISOString() };
  }, [monthOffset]);

  const { data, isLoading, isFetching } = useAppointments(startISO, endISO);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data ?? []).filter((a) =>
      !q || [a.customerName, a.phone].join(" ").toLowerCase().includes(q));
    const map = new Map<string, Appointment[]>();
    for (const a of list) {
      const k = dayKey(a.time);
      (map.get(k) ?? map.set(k, []).get(k)!).push(a);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data, search]);

  const total = (data ?? []).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Appointments</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {total.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        {/* Month navigation */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-ink-2 hover:bg-surface-2"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[150px] text-center text-sm font-semibold">{monthLabel(monthStart)}</span>
          <button onClick={() => setMonthOffset((m) => m + 1)} aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-ink-2 hover:bg-surface-2"><ChevronRight className="h-4 w-4" /></button>
          {monthOffset !== 0 && <Button variant="default" onClick={() => setMonthOffset(0)}>Today</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, phone…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-ink-3" />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {LEGEND.map((l) => <Badge key={l.label} tone={l.tone}>{l.label}</Badge>)}
        </div>
      </div>

      {!configured ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Connect the API to load appointments.</div>
      ) : isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">
          <CalendarDays className="mx-auto mb-2 h-6 w-6 text-ink-3" />
          No appointments in {monthLabel(monthStart)}.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([key, rows]) => (
            <div key={key}>
              <div className="mb-1.5 flex items-center gap-2">
                <h2 className="text-sm font-bold">{dayHeader(rows[0].time)}</h2>
                {isToday(rows[0].time) && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand">Today</span>}
                <span className="text-xs text-ink-3">· {rows.length}</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                {rows.map((a) => {
                  const st = appointmentStatus(a.suspended, a.time);
                  return (
                    <button key={a.appointmentId} onClick={() => setSelected(a)}
                      className="flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-2">
                      <span className="w-20 shrink-0 text-sm font-semibold tnum text-ink-2">{timeLabel(a.time)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{a.customerName}</span>
                        {a.phone && <span className="block text-xs tnum text-ink-3">{a.phone}</span>}
                      </span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentDetailModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onCancelled={() => qc.invalidateQueries({ queryKey: ["appointments"] })}
      />
    </div>
  );
}
