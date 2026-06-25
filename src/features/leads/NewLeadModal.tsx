import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useLeadStatuses, useLeadSources, useCreateLead, type NewLeadInput } from "./api";

const EMPTY: NewLeadInput = {
  firstName: "", lastName: "", email: "", mobile: "", statusId: "", fromCampaign: "", followupDate: "", leadFeedback: "",
};

export function NewLeadModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [f, setF] = useState<NewLeadInput>(EMPTY);
  const [err, setErr] = useState("");
  const { data: statuses } = useLeadStatuses();
  const { data: sources } = useLeadSources();
  const create = useCreateLead();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { if (open) { setF(EMPTY); setErr(""); } }, [open]);

  const set = (k: keyof NewLeadInput) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.firstName.trim()) return setErr("First name is required.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr("A valid email is required.");
    if (!/^\d{10}$/.test(f.mobile.trim())) return setErr("Phone number must be 10 digits.");
    if (!f.statusId) return setErr("Lead status is required.");
    if (!f.fromCampaign) return setErr("Lead from campaign is required.");
    if (!f.followupDate) return setErr("Next follow-up date is required.");
    setErr("");
    create.mutate(f, {
      onSuccess: () => { onCreated(); onClose(); },
      onError: () => setErr("Could not create the lead. Check the fields and try again."),
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New Lead">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <p className="text-[13px] text-ink-2">Fields in <span className="font-semibold text-danger">red</span> are required.</p>
        <FieldRow label="First Name" required>
          <input value={f.firstName} onChange={(e) => set("firstName")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Last Name">
          <input value={f.lastName} onChange={(e) => set("lastName")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Email" required>
          <input type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Phone Number" required>
          <input inputMode="numeric" value={f.mobile}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); set("mobile")(v); }}
            className={fieldCls} placeholder="10-digit mobile" />
        </FieldRow>
        <FieldRow label="Lead Status" required>
          <select value={f.statusId} onChange={(e) => set("statusId")(e.target.value)} className={fieldCls}>
            <option value="">Select…</option>
            {(statuses ?? []).map((s) => <option key={s.id} value={String(s.id)}>{s.status}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Lead from Campaign" required>
          <select value={f.fromCampaign} onChange={(e) => set("fromCampaign")(e.target.value)} className={fieldCls}>
            <option value="">Select…</option>
            {(sources ?? []).map((s) => <option key={String(s.id)} value={String(s.id)}>{s.source}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Next Follow-Up" required>
          <input type="date" min={today} value={f.followupDate} onChange={(e) => set("followupDate")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Lead Feedback">
          <textarea rows={3} value={f.leadFeedback} onChange={(e) => set("leadFeedback")(e.target.value)} className={fieldCls} />
        </FieldRow>
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Generate Lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
