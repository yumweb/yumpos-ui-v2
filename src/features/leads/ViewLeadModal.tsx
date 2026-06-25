import { useEffect, useState } from "react";
import { Loader2, CalendarPlus } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button, Badge } from "@/components/ui/primitives";
import { useLeadStatuses, useLeadFeedback, useUpdateLead, leadName, type Lead, type LeadFeedback } from "./api";
import { statusTone } from "./constants";

const fmt = (raw?: string | null) => {
  if (!raw) return "—";
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? raw : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** ISO → local YYYY-MM-DD for a <input type=date> (avoids UTC off-by-one). */
const toDateInput = (raw?: string | null) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function ViewLeadModal({ lead, onClose, onUpdated, onBookAppointment }: {
  lead: Lead | null;
  onClose: () => void;
  onUpdated: () => void;
  onBookAppointment: (l: Lead) => void;
}) {
  const open = !!lead;
  const [status, setStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [feedback, setFeedback] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const { data: statuses } = useLeadStatuses();
  const { data: history, isLoading: histLoading } = useLeadFeedback(lead?.id ?? null, 1, 10);
  const update = useUpdateLead();

  useEffect(() => {
    if (!lead) return;
    setStatus(String(lead.leadStatus?.id ?? lead.statusId ?? ""));
    setFollowUpDate(toDateInput(lead.followupDate));
    setFeedback("");
    setErr(""); setOk(false);
  }, [lead]);

  if (!lead) return null;

  const rows: LeadFeedback[] = Array.isArray(history)
    ? history
    : (history?.feedback ?? history?.history ?? []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return setErr("Select a status.");
    setErr("");
    update.mutate(
      { id: lead!.id, input: { statusId: status, followupDate: followUpDate, leadFeedback: feedback } },
      {
        onSuccess: () => { setOk(true); onUpdated(); setTimeout(onClose, 900); },
        onError: () => setErr("Could not update the lead."),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Lead Details" width="max-w-[600px]">
      <div className="grid gap-4 p-5">
        {/* Read-only summary */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-2 p-4 text-sm">
          <Info label="Name" value={leadName(lead)} />
          <Info label="Mobile" value={lead.mobile || "—"} />
          <Info label="Email" value={lead.email || "—"} />
          <Info label="Source" value={lead.leadSource?.source || "NA"} />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-3">Status:</span>
            {lead.leadStatus?.status ? <Badge tone={statusTone(lead.leadStatus?.id)}>{lead.leadStatus.status}</Badge> : "—"}
          </div>
          <Info label="Converted" value={lead.isConverted ? "Yes" : "No"} />
        </div>

        {/* Feedback history */}
        <div>
          <h3 className="mb-2 text-sm font-bold">Feedback History</h3>
          <div className="max-h-44 overflow-auto rounded-lg border border-border">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <tr><th className="px-3 py-2 font-semibold">Date</th><th className="px-3 py-2 font-semibold">Feedback</th></tr>
              </thead>
              <tbody>
                {histLoading ? (
                  <tr><td colSpan={2} className="px-3 py-4 text-center text-ink-3">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={2} className="px-3 py-4 text-center text-ink-3">No feedback yet.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-ink-2">{fmt(r.dateCreated)}</td>
                    <td className="px-3 py-2">{r.feedback || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Update form */}
        <form onSubmit={submit} className="grid gap-3 border-t border-border pt-4">
          <FieldRow label="Lead Status" required>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls}>
              <option value="">Select…</option>
              {(statuses ?? []).map((s) => <option key={s.id} value={String(s.id)}>{s.status}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Next Followup">
            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={fieldCls} />
          </FieldRow>
          <FieldRow label="Lead Feedback">
            <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} className={fieldCls} placeholder="Add a new note…" />
          </FieldRow>
          {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
          {ok && <div className="rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">Lead updated.</div>}
          <div className="mt-1 flex items-center justify-between gap-2">
            <Button type="button" variant="accent" onClick={() => onBookAppointment(lead)}>
              <CalendarPlus className="h-4 w-4" /> Book Appointment
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="default" onClick={onClose}>Close</Button>
              <Button type="submit" variant="primary" disabled={update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit Feedback
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-ink-3">{label}:</span>
      <span className="text-ink truncate">{value}</span>
    </div>
  );
}
