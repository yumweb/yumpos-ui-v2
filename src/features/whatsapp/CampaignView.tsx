import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Play, Pause, X, Loader2 } from "lucide-react";
import { Card, Button, Badge, type BadgeTone } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/DataTable";
import { WaGate } from "./WaGate";
import {
  useCampaign, useCampaignRecipients, startCampaign, pauseCampaign, cancelCampaign,
  type CampaignRecipient, type CampaignStatus,
} from "./api";

const STATUS: Record<CampaignStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "default" }, scheduled: { label: "Scheduled", tone: "brand" },
  sending: { label: "Sending", tone: "warn" }, sent: { label: "Completed", tone: "ok" },
  paused: { label: "Paused", tone: "default" }, cancelled: { label: "Cancelled", tone: "danger" },
};
const recipientTone = (s?: string): BadgeTone =>
  s === "read" || s === "delivered" ? "ok" : s === "sent" ? "brand" : s === "failed" ? "danger" : "default";
const fmtDate = (d?: string) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const STATUS_FILTERS = [["", "All"], ["pending", "Pending"], ["sent", "Sent"], ["delivered", "Delivered"], ["read", "Read"], ["failed", "Failed"]];
const LIMIT = 50;

export function CampaignView() {
  return <WaGate><CampaignViewInner /></WaGate>;
}

function CampaignViewInner() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { campaignId } = useParams();
  const id = campaignId ? Number(campaignId) : undefined;

  const { data: c, isLoading, refetch } = useCampaign(id);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const { data: recipientsData, isLoading: recLoading, isError: recError } = useCampaignRecipients(id, page, LIMIT, statusFilter, "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>, confirmMsg?: string) {
    if (!id) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true); setErr(null);
    try { await fn(); qc.invalidateQueries({ queryKey: ["wa-campaign"] }); await refetch(); }
    catch (e) { setErr((e as Error)?.message || "Action failed."); }
    finally { setBusy(false); }
  }

  if (isLoading) return <div className="grid min-h-[40vh] place-items-center text-ink-3"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!c) return <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Campaign not found.</div>;

  const st = STATUS[c.status] ?? { label: c.status, tone: "default" as BadgeTone };
  const s = c.stats ?? {};
  const recipients = recipientsData?.recipients ?? [];
  const total = recipientsData?.total ?? 0;

  const columns: Column<CampaignRecipient>[] = [
    { header: "Customer", cell: (r) => r.customerName || "-" },
    { header: "Phone", cell: (r) => <span className="font-mono text-xs">{r.phoneNumber}</span> },
    { header: "Status", cell: (r) => <Badge tone={recipientTone(r.status)}>{r.status ?? "-"}</Badge> },
    { header: "Sent at", cell: (r) => <span className="text-xs">{fmtDate(r.sentAt)}</span> },
    { header: "Error", cell: (r) => r.errorMessage ? <span className="text-xs text-danger">{r.errorMessage}</span> : "-" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => nav("/whatsapp/campaigns")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <h1 className="text-[25px] font-bold tracking-tight">{c.name}</h1>
        <Badge tone={st.tone}>{st.label}</Badge>
        <div className="flex-1" />
        <Button variant="default" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        {c.status === "draft" && <Button variant="accent" disabled={busy} onClick={() => act(() => startCampaign(id!), "Start this campaign now?")}><Play className="h-4 w-4" /> Start</Button>}
        {c.status === "sending" && <>
          <Button variant="default" disabled={busy} onClick={() => act(() => pauseCampaign(id!))}><Pause className="h-4 w-4" /> Pause</Button>
          <Button variant="danger" disabled={busy} onClick={() => act(() => cancelCampaign(id!), "Cancel this campaign? This cannot be undone.")}><X className="h-4 w-4" /> Cancel</Button>
        </>}
        {c.status === "paused" && <>
          <Button variant="accent" disabled={busy} onClick={() => act(() => startCampaign(id!))}><Play className="h-4 w-4" /> Resume</Button>
          <Button variant="danger" disabled={busy} onClick={() => act(() => cancelCampaign(id!), "Cancel this campaign? This cannot be undone.")}><X className="h-4 w-4" /> Cancel</Button>
        </>}
      </div>

      {c.description && <p className="-mt-2 text-sm text-ink-2">{c.description}</p>}
      {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Recipients" value={s.totalRecipients ?? 0} />
        <Stat label="Sent" value={s.sentCount ?? 0} />
        <Stat label="Delivered" value={s.deliveredCount ?? 0} />
        <Stat label="Read" value={s.readCount ?? 0} />
        <Stat label="Failed" value={s.failedCount ?? 0} tone="danger" />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <Info label="Template"><span className="font-mono text-xs">{c.templateName}</span></Info>
          <Info label="Language">{c.templateLanguage || "en"}</Info>
          <Info label="Audience">{c.audienceType.replace(/_/g, " ")}</Info>
          <Info label="Created">{fmtDate(c.createdAt)}</Info>
          <Info label="Scheduled">{fmtDate(c.scheduledAt)}</Info>
          <Info label="Started">{fmtDate(c.startedAt)}</Info>
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">Recipients</h2>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none">
            {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <DataTable
          columns={columns} rows={recipients} getRowId={(r) => String(r.id)}
          configured loading={recLoading} error={recError}
          page={page} maxPage={Math.max(1, Math.ceil(total / LIMIT))} count={total} onPage={setPage}
          emptyText="No recipients yet." countNoun="recipients"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <Card className="p-4">
      <div className={`text-2xl font-bold tnum ${tone === "danger" && value > 0 ? "text-danger" : ""}`}>{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-ink-3">{label}</div>
    </Card>
  );
}
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span className="block text-xs text-ink-3">{label}</span><span className="font-medium">{children}</span></div>;
}
