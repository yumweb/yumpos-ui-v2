import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useSmsTemplates, useSendSms, type Lead } from "./api";

const hasVars = (s: string) => /%%.*?%%/.test(s);

export function SmsModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const open = !!lead;
  const { data: templates } = useSmsTemplates();
  const send = useSendSms();
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => { if (lead) { setTemplateId(""); setMessage(""); setErr(""); setOk(false); } }, [lead]);

  if (!lead) return null;

  const onPickTemplate = (id: string) => {
    setTemplateId(id);
    const t = (templates ?? []).find((x) => String(x.id) === id);
    if (t) setMessage(t.body);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return setErr("Message is required.");
    setErr("");
    send.mutate(
      { message: message.trim(), mobile: lead!.mobile ?? "" },
      {
        onSuccess: () => { setOk(true); setTimeout(onClose, 1200); },
        onError: () => setErr("Could not send the SMS. Please try again."),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Send SMS">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <FieldRow label="Phone Number"><input readOnly value={lead.mobile || ""} className={`${fieldCls} bg-surface-2`} /></FieldRow>
        <FieldRow label="SMS Template">
          <select value={templateId} onChange={(e) => onPickTemplate(e.target.value)} className={fieldCls}>
            <option value="">None</option>
            {(templates ?? []).map((t) => <option key={String(t.id)} value={String(t.id)}>{t.title}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Message" required>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={fieldCls} />
        </FieldRow>
        {hasVars(message) && (
          <p className="text-xs text-warn">This template has %%variables%% — replace them before sending.</p>
        )}
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        {ok && <div className="rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">SMS sent.</div>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send
          </Button>
        </div>
      </form>
    </Modal>
  );
}
