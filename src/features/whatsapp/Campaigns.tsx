import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Eye, Pencil, Play, Pause, X, Trash2, Loader2 } from "lucide-react";
import { Card, Button, Badge, type BadgeTone } from "@/components/ui/primitives";
import { WaGate } from "./WaGate";
import { useCampaigns, startCampaign, pauseCampaign, cancelCampaign, deleteCampaign, type Campaign, type CampaignStatus } from "./api";

const STATUS: Record<CampaignStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "default" },
  scheduled: { label: "Scheduled", tone: "brand" },
  sending: { label: "Sending", tone: "warn" },
  sent: { label: "Completed", tone: "ok" },
  paused: { label: "Paused", tone: "default" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const progressOf = (c: Campaign) => {
  const s = c.stats;
  if (!s?.totalRecipients) return 0;
  return Math.round(((s.sentCount ?? 0) + (s.failedCount ?? 0)) / s.totalRecipients * 100);
};

export function Campaigns() {
  return (
    <WaGate>
      <CampaignsInner />
    </WaGate>
  );
}

function CampaignsInner() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: campaigns = [], isLoading, isError, refetch } = useCampaigns();
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  async function act(id: number, fn: () => Promise<unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy((b) => ({ ...b, [id]: true })); setErr(null);
    try { await fn(); qc.invalidateQueries({ queryKey: ["wa-campaigns"] }); }
    catch (e) { setErr((e as Error)?.message || "Action failed."); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight">WhatsApp Campaigns</h1>
          <p className="mt-1 text-sm text-ink-2">Send bulk marketing messages to your customers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          <Button variant="primary" onClick={() => nav("/whatsapp/campaigns/create")}><Plus className="h-4 w-4" /> Create campaign</Button>
        </div>
      </div>

      {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-3 pl-5 font-semibold">Campaign</th><th className="px-3 py-3 font-semibold">Template</th>
                <th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Progress</th>
                <th className="px-3 py-3 font-semibold">Created</th><th className="px-3 py-3 pr-5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-3">Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-medium text-danger">Couldn’t load campaigns.</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-3">No campaigns yet. Create one to send your first marketing message.</td></tr>
              ) : campaigns.map((c) => {
                const st = STATUS[c.status] ?? { label: c.status, tone: "default" as BadgeTone };
                const isBusy = !!busy[c.id];
                const pct = progressOf(c);
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-2">
                    <td className="px-3 py-2.5 pl-5">
                      <div className="font-semibold">{c.name}</div>
                      {c.description && <div className="text-xs text-ink-3">{c.description}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{c.templateName}</td>
                    <td className="px-3 py-2.5"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="min-w-[150px] px-3 py-2.5">
                      {c.status === "sending" || c.status === "sent" ? (
                        <div>
                          <div className="mb-0.5 flex justify-between text-xs text-ink-3"><span>{c.stats?.sentCount ?? 0} / {c.stats?.totalRecipients ?? 0}</span><span>{pct}%</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className={`h-full ${pct === 100 ? "bg-ok" : "bg-brand"}`} style={{ width: `${pct}%` }} /></div>
                          {(c.stats?.failedCount ?? 0) > 0 && <div className="mt-0.5 text-xs text-danger">{c.stats?.failedCount} failed</div>}
                        </div>
                      ) : c.status === "scheduled" ? (
                        <span className="text-xs text-ink-3">Scheduled: {fmtDate(c.scheduledAt)}</span>
                      ) : c.status === "draft" ? (
                        <span className="text-xs text-ink-3">Not started</span>
                      ) : <span className="text-xs text-ink-3">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{fmtDate(c.createdAt)}</td>
                    <td className="px-3 py-2.5 pr-5">
                      <div className="flex items-center gap-1">
                        <IconBtn title="View details" onClick={() => nav(`/whatsapp/campaigns/view/${c.id}`)}><Eye className="h-4 w-4" /></IconBtn>
                        {c.status === "draft" && (
                          <>
                            <IconBtn title="Edit" onClick={() => nav(`/whatsapp/campaigns/edit/${c.id}`)}><Pencil className="h-4 w-4" /></IconBtn>
                            <IconBtn title="Start campaign" disabled={isBusy} onClick={() => act(c.id, () => startCampaign(c.id), "Start this campaign now? Messages will be sent to all recipients.")}><Play className="h-4 w-4 text-ok" /></IconBtn>
                            <IconBtn title="Delete" disabled={isBusy} onClick={() => act(c.id, () => deleteCampaign(c.id), "Delete this draft campaign?")}><Trash2 className="h-4 w-4 text-danger" /></IconBtn>
                          </>
                        )}
                        {c.status === "sending" && (
                          <>
                            <IconBtn title="Pause" disabled={isBusy} onClick={() => act(c.id, () => pauseCampaign(c.id))}><Pause className="h-4 w-4 text-warn" /></IconBtn>
                            <IconBtn title="Cancel" disabled={isBusy} onClick={() => act(c.id, () => cancelCampaign(c.id), "Cancel this campaign? This cannot be undone.")}><X className="h-4 w-4 text-danger" /></IconBtn>
                          </>
                        )}
                        {c.status === "paused" && (
                          <>
                            <IconBtn title="Resume" disabled={isBusy} onClick={() => act(c.id, () => startCampaign(c.id))}><Play className="h-4 w-4 text-ok" /></IconBtn>
                            <IconBtn title="Cancel" disabled={isBusy} onClick={() => act(c.id, () => cancelCampaign(c.id), "Cancel this campaign? This cannot be undone.")}><X className="h-4 w-4 text-danger" /></IconBtn>
                          </>
                        )}
                        {c.status === "scheduled" && (
                          <IconBtn title="Cancel" disabled={isBusy} onClick={() => act(c.id, () => cancelCampaign(c.id), "Cancel this scheduled campaign?")}><X className="h-4 w-4 text-danger" /></IconBtn>
                        )}
                        {isBusy && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-surface disabled:opacity-40">
      {children}
    </button>
  );
}
