import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { isApiConfigured } from "@/lib/apiClient";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import {
  useTickets, useCloseTicket, sendTicketOtp, verifyTicketOtp, ticketTypeLabel, type Ticket,
} from "./api";
import { NewTicketModal } from "./NewTicketModal";
import { TicketDetailModal } from "./TicketDetailModal";
import { ExitTickets } from "./ExitTickets";

const LIMIT = 10;
const fmt = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit" });
};

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("rounded px-3 py-1.5 text-sm font-semibold", active ? "bg-brand-100 text-brand" : "text-ink-2 hover:bg-surface-2")}>
      {children}
    </button>
  );
}

export function Tickets() {
  const [tab, setTab] = useState<"staffing" | "training" | "exit">("staffing");
  const type: 1 | 2 = tab === "training" ? 2 : 1;
  const [closed, setClosed] = useState(false);
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [closeTarget, setCloseTarget] = useState<Ticket | null>(null);
  const [otp, setOtp] = useState("");
  const [otpErr, setOtpErr] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);

  const configured = isApiConfigured();
  const qc = useQueryClient();
  const { data, isLoading } = useTickets(page, LIMIT, closed, type);
  const close = useCloseTicket();
  const count = data?.count ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["tickets"] });

  async function openCloseFlow(t: Ticket) {
    setCloseTarget(t); setOtp(""); setOtpErr("");
    try { await sendTicketOtp(); } catch { /* surfaced on verify */ }
  }
  async function confirmClose() {
    if (!closeTarget) return;
    setOtpBusy(true); setOtpErr("");
    try {
      const res = await verifyTicketOtp(otp.trim());
      if (!res?.valid) { setOtpErr("Invalid OTP."); setOtpBusy(false); return; }
      await close.mutateAsync(closeTarget.id);
      setCloseTarget(null); refresh();
    } catch {
      setOtpErr("Could not close the ticket. Try again.");
    } finally { setOtpBusy(false); }
  }

  const columns: Column<Ticket>[] = [
    { header: "Location", cell: (t) => t.location?.name || "—" },
    { header: "Ticket #", cell: (t) => <span className="tnum">#{t.id}</span> },
    { header: "Date", cell: (t) => fmt(t.ticketTime) },
    { header: "Type", cell: (t) => ticketTypeLabel(t.ticketType) },
    { header: "Feedback", cell: (t) => {
      const n = t.ticketFeedbacks?.length ?? 0;
      return n > 0 ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tnum">{n}</span> : <span className="text-xs font-semibold text-brand">New</span>;
    } },
    { header: "Action", cell: (t) => (
      <div className="flex items-center gap-3">
        <button onClick={() => setViewId(t.id)} className="font-semibold text-brand hover:underline">View</button>
        {!closed && <button onClick={() => openCloseFlow(t)} className="font-semibold text-danger hover:underline">Close</button>}
      </div>
    ) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Tickets</h1>
        <div className="flex-1" />
        {tab !== "exit" && (
          <Button variant="primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New Ticket</Button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {([["staffing", "Staffing"], ["training", "Training"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setPage(1); }}
            className={cn("border-b-2 px-1 pb-2 text-sm font-semibold", tab === id ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink")}>
            {label}
          </button>
        ))}
        <button onClick={() => { setTab("exit"); setPage(1); }}
          className={cn("border-b-2 px-1 pb-2 text-sm font-semibold", tab === "exit" ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink")}>
          Staff Exit
        </button>
      </div>

      {tab === "exit" ? (
        <ExitTickets />
      ) : (
        <>
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 w-fit">
            <Seg active={!closed} onClick={() => { setClosed(false); setPage(1); }}>Open</Seg>
            <Seg active={closed} onClick={() => { setClosed(true); setPage(1); }}>Closed</Seg>
          </div>

          <DataTable
            columns={columns}
            rows={data?.tickets ?? []}
            getRowId={(t) => String(t.id)}
            configured={configured}
            loading={isLoading}
            page={page}
            maxPage={Math.max(1, Math.ceil(count / LIMIT))}
            count={count}
            onPage={setPage}
            emptyText={`No ${type === 1 ? "staffing" : "training"} tickets${closed ? " (closed)" : ""}.`}
            countNoun="tickets"
          />
        </>
      )}

      <NewTicketModal open={newOpen} initialTab={tab === "training" ? "training" : "staffing"} onClose={() => setNewOpen(false)} onCreated={() => { refresh(); qc.invalidateQueries({ queryKey: ["exit-tickets"] }); }} />
      <TicketDetailModal ticketId={viewId} onClose={() => setViewId(null)} onChanged={refresh} />

      {/* OTP close */}
      <Modal open={!!closeTarget} onClose={() => setCloseTarget(null)} title="Close ticket" width="max-w-[420px]">
        <div className="grid gap-3 p-5">
          <p className="text-sm text-ink-2">An OTP was sent for verification. Enter it to close ticket <span className="font-semibold tnum text-ink">#{closeTarget?.id}</span>.</p>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" placeholder="Enter OTP"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          {otpErr && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{otpErr}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="default" onClick={() => setCloseTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" onClick={confirmClose} disabled={otpBusy || !otp.trim()}>
              {otpBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify & Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
