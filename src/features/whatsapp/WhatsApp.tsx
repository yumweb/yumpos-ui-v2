import { Fragment, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCw, ChevronDown, ChevronUp, Trash2, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, Button, Badge, type BadgeTone } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal";
import { getLocation } from "@/lib/auth";
import { WaGate } from "./WaGate";
import { WhatsAppSetup } from "./WhatsAppSetup";
import {
  useWaTemplates, deleteWaTemplate, type WaTemplate,
  getSubmittedTemplates, getAvailableDefinitions, syncTemplateStatuses, submitDefaultTemplates, submitDefinition, setActiveTemplate,
  type SubmittedByPurpose, type AvailableByPurpose,
} from "./api";

const PURPOSE_LABELS: Record<string, string> = {
  APPOINTMENT_CONFIRMATION: "Appointment confirmation",
  INVOICE_RECEIPT: "Invoice / Receipt",
  BIRTHDAY_WISH: "Birthday wish",
  ANNIVERSARY_WISH: "Anniversary wish",
  OTP_VERIFICATION: "OTP verification",
  ICE_BREAKER: "Ice breaker (start chat)",
  REFERRAL_COUPON: "Referral coupon",
};

const statusTone = (s?: string): BadgeTone =>
  s?.toUpperCase() === "APPROVED" ? "ok" : s?.toUpperCase() === "PENDING" ? "warn" : s?.toUpperCase() === "REJECTED" ? "danger" : "default";

const formatVersion = (v?: string) => (!v || v.length !== 14 ? v : `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`);

export function WhatsApp() {
  const location = getLocation();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[25px] font-bold tracking-tight">WhatsApp Business</h1>
        <p className="mt-1 text-sm text-ink-2">Connect and manage WhatsApp Business for {location?.locationName ?? location?.name ?? "your location"}.</p>
      </div>
      <WaGate>
        <Section title="WhatsApp setup"><WhatsAppSetup /></Section>
        <Section title="Notification templates" desc="Used for automated notifications (invoices, appointments, birthday wishes). Status is synced from Meta and templates must be approved before use.">
          <NotificationTemplates />
        </Section>
        <Section title="Message templates" desc="Pre-approved message formats for initiating conversations outside the 24-hour window.">
          <MessageTemplates />
        </Section>
      </WaGate>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-bold">{title}</h2>
      {desc && <p className="mb-3 mt-0.5 text-sm text-ink-2">{desc}</p>}
      <div className={desc ? "" : "mt-3"}>{children}</div>
    </Card>
  );
}

/* ───────────────────────── Message templates ───────────────────────── */

function MessageTemplates() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading, isError, refetch } = useWaTemplates();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toDelete, setToDelete] = useState<WaTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try { await deleteWaTemplate(toDelete.name); qc.invalidateQueries({ queryKey: ["wa-templates"] }); setToDelete(null); }
    finally { setDeleting(false); }
  }

  const qualityChip = (q?: string | { score?: string }) => {
    const raw = (typeof q === "object" && q ? q.score : q) || "UNKNOWN";
    const s = raw.toString().toUpperCase();
    const map: Record<string, { tone: BadgeTone; label: string }> = {
      GREEN: { tone: "ok", label: "High quality" }, HIGH: { tone: "ok", label: "High quality" },
      YELLOW: { tone: "warn", label: "Medium quality" }, MEDIUM: { tone: "warn", label: "Medium quality" },
      RED: { tone: "danger", label: "Low quality" }, LOW: { tone: "danger", label: "Low quality" },
    };
    const m = map[s] ?? { tone: "default" as BadgeTone, label: "Not yet rated" };
    return <Badge tone={m.tone}>{m.label}</Badge>;
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-ink-2">{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
        <Button variant="default" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>
      {isLoading ? (
        <Empty>Loading templates…</Empty>
      ) : isError ? (
        <Empty danger>Couldn’t load templates.</Empty>
      ) : templates.length === 0 ? (
        <Empty>No message templates yet.</Empty>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                <th className="w-8 px-3 py-2.5" /><th className="px-3 py-2.5 font-semibold">Name</th><th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">Language</th><th className="px-3 py-2.5 font-semibold">Status</th><th className="px-3 py-2.5 font-semibold">Quality</th>
                <th className="px-3 py-2.5 text-right font-semibold">Sent</th><th className="px-3 py-2.5 text-right font-semibold">Delivered</th><th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const key = t.name + t.language;
                const open = !!expanded[key];
                return (
                  <Fragment key={key}>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2"><button onClick={() => setExpanded((e) => ({ ...e, [key]: !open }))} className="text-ink-3 hover:text-ink">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button></td>
                      <td className="px-3 py-2 font-mono text-xs">{t.name}</td>
                      <td className="px-3 py-2 capitalize">{(t.category ?? "").toLowerCase() || "-"}</td>
                      <td className="px-3 py-2">{t.language}</td>
                      <td className="px-3 py-2"><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
                      <td className="px-3 py-2">{qualityChip(t.quality_score)}</td>
                      <td className="px-3 py-2 text-right tnum">{t.sent_total ?? 0}</td>
                      <td className="px-3 py-2 text-right tnum">{t.delivered_total ?? 0}</td>
                      <td className="px-3 py-2"><button onClick={() => setToDelete(t)} aria-label="Delete" className="text-ink-3 hover:text-danger"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                    {open && (
                      <tr className="border-t border-border bg-surface-2">
                        <td colSpan={9} className="px-4 py-3">
                          {t.header_media_url && (
                            <a href={t.header_media_url} target="_blank" rel="noreferrer" className="mb-2 block text-xs font-semibold text-brand hover:underline">
                              {t.header_media_type === "IMAGE" ? "Image header — open" : t.header_media_type === "VIDEO" ? "Video header — open" : "Document header — open"}
                            </a>
                          )}
                          <pre className="whitespace-pre-wrap font-mono text-xs text-ink-2">{formatComponents(t.components)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete template?">
        <div className="p-5"><p className="text-sm text-ink-2">Delete the template “{toDelete?.name}”? This action cannot be undone.</p></div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function formatComponents(components?: WaTemplate["components"]) {
  if (!components?.length) return "No components";
  return components.map((c) => {
    if (c.type === "HEADER") return `Header: ${c.format || "TEXT"} - ${c.text || c.example?.header_text?.[0] || ""}`;
    if (c.type === "BODY") return `Body: ${c.text || ""}`;
    if (c.type === "FOOTER") return `Footer: ${c.text || ""}`;
    if (c.type === "BUTTONS") return `Buttons: ${c.buttons?.map((b) => b.text).join(", ") || ""}`;
    return `${c.type}`;
  }).join("\n");
}

/* ───────────────────────── Notification templates ───────────────────────── */

function NotificationTemplates() {
  const [submitted, setSubmitted] = useState<SubmittedByPurpose>({});
  const [available, setAvailable] = useState<AvailableByPurpose>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [s, a] = await Promise.all([getSubmittedTemplates().catch(() => ({})), getAvailableDefinitions().catch(() => ({}))]);
      setSubmitted(s as SubmittedByPurpose); setAvailable(a as AvailableByPurpose);
    } catch (e) { setErr((e as Error)?.message || "Failed to load notification templates."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const purposes = [...new Set([...Object.keys(submitted), ...Object.keys(available)])].sort();
  const hasAny = Object.keys(submitted).length > 0;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setErr(null); setNotice(null);
    try { await fn(); setNotice(ok); await load(); }
    catch (e) { setErr((e as Error)?.message || "Action failed."); }
  }

  const statusIcon = (s?: string) =>
    s?.toUpperCase() === "APPROVED" ? <CheckCircle2 className="h-4 w-4 text-ok" /> :
    s?.toUpperCase() === "PENDING" ? <Clock className="h-4 w-4 text-warn" /> :
    s?.toUpperCase() === "REJECTED" ? <XCircle className="h-4 w-4 text-danger" /> : null;

  return (
    <div>
      {err && <div className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
      {notice && <div className="mb-3 rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm text-ok">{notice}</div>}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-ink-2">{purposes.length} notification type{purposes.length !== 1 ? "s" : ""}</span>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={async () => { setSyncing(true); await run(() => syncTemplateStatuses(), "Template statuses synced."); setSyncing(false); }} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Sync status
          </Button>
          {!hasAny && <Button variant="primary" size="sm" onClick={() => run(() => submitDefaultTemplates(), "Default templates submitted.")}>Submit all default templates</Button>}
        </div>
      </div>

      {loading ? (
        <Empty>Loading notification templates…</Empty>
      ) : purposes.length === 0 ? (
        <Empty>No notification templates configured. Submit the default templates to create one per type.</Empty>
      ) : (
        <div className="space-y-3">
          {purposes.map((p) => {
            const sub = submitted[p] ?? { active: null, all: [] };
            const avail = available[p] ?? { submitted: [], available: [] };
            return (
              <div key={p} className="rounded-md border border-border p-3">
                <h3 className="mb-2 text-sm font-bold">{PURPOSE_LABELS[p] || p}</h3>
                {sub.all.length > 0 && (
                  <div className="mb-2 overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-surface-2 text-left text-ink-3"><th className="px-2 py-1.5">Version</th><th className="px-2 py-1.5">Template</th><th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5">Active</th><th className="px-2 py-1.5" /></tr></thead>
                      <tbody>
                        {sub.all.map((t) => (
                          <tr key={t.id} className="border-t border-border">
                            <td className="px-2 py-1.5 font-mono">{formatVersion(t.definitionVersion) || "Legacy"}</td>
                            <td className="px-2 py-1.5 font-mono text-[11px]">{t.templateName || "-"}</td>
                            <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1">{statusIcon(t.status)}<Badge tone={statusTone(t.status)}>{t.status}</Badge></span></td>
                            <td className="px-2 py-1.5">{t.isActive ? <Badge tone="ok">Active</Badge> : <span className="text-ink-3">-</span>}</td>
                            <td className="px-2 py-1.5">{t.status === "APPROVED" && !t.isActive && (
                              <Button variant="default" size="sm" onClick={() => { setBusyId(t.id); run(() => setActiveTemplate(t.id), "Active template updated.").finally(() => setBusyId(null)); }} disabled={busyId === t.id}>Set active</Button>
                            )}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {avail.available.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-ink-3">Available versions to submit:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {avail.available.map((d) => (
                        <button key={d.id} onClick={() => { setBusyId(d.id); run(() => submitDefinition(d.id), "Template submitted for approval.").finally(() => setBusyId(null)); }} disabled={busyId === d.id}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink-2 hover:bg-surface-2 disabled:opacity-50">
                          {busyId === d.id && <Loader2 className="h-3 w-3 animate-spin" />} v{formatVersion(d.version)}{d.isCurrent ? " (Latest)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sub.all.length === 0 && avail.available.length === 0 && <p className="text-xs text-ink-3">No templates available for this purpose.</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <div className={`rounded-md border border-border bg-surface p-8 text-center text-sm ${danger ? "text-danger" : "text-ink-3"}`}>{children}</div>;
}
