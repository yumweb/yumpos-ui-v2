import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useSendWhatsapp, type Lead } from "./api";
import { WHATSAPP_TEMPLATES } from "./constants";

export function WhatsappModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const open = !!lead;
  const send = useSendWhatsapp();
  const [templateId, setTemplateId] = useState("");
  const [variable1, setVariable1] = useState("");
  const [variable2, setVariable2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => { if (lead) { setTemplateId(""); setVariable1(""); setVariable2(""); setErr(""); setOk(false); } }, [lead]);

  const tmpl = useMemo(() => WHATSAPP_TEMPLATES.find((t) => String(t.id) === templateId), [templateId]);
  const needsV1 = !!tmpl?.body.includes("$(variable1)");
  const needsV2 = !!tmpl?.body.includes("$(variable2)");
  const preview = useMemo(() => {
    if (!tmpl) return "";
    return tmpl.body.replace("$(variable1)", variable1 || "$(variable1)").replace("$(variable2)", variable2 || "$(variable2)");
  }, [tmpl, variable1, variable2]);

  if (!lead) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return setErr("Select a template.");
    if (needsV1 && !variable1.trim()) return setErr("variable1 is required for this template.");
    if (needsV2 && !variable2.trim()) return setErr("variable2 is required for this template.");
    setErr("");
    send.mutate(
      { templateId, variable1: variable1.trim(), variable2: variable2.trim(), mobile: lead!.mobile ?? "" },
      {
        onSuccess: () => { setOk(true); setTimeout(onClose, 1200); },
        onError: () => setErr("Could not send the WhatsApp message. Please try again."),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Send WhatsApp">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <FieldRow label="Phone Number"><input readOnly value={lead.mobile || ""} className={`${fieldCls} bg-surface-2`} /></FieldRow>
        <FieldRow label="Template" required>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={fieldCls}>
            <option value="">Select…</option>
            {WHATSAPP_TEMPLATES.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.body.slice(0, 48)}{t.body.length > 48 ? "…" : ""}</option>
            ))}
          </select>
        </FieldRow>
        {needsV1 && (
          <FieldRow label="variable1" required>
            <input value={variable1} onChange={(e) => setVariable1(e.target.value)} className={fieldCls} />
          </FieldRow>
        )}
        {needsV2 && (
          <FieldRow label="variable2" required>
            <input value={variable2} onChange={(e) => setVariable2(e.target.value)} className={fieldCls} />
          </FieldRow>
        )}
        {tmpl && (
          <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink-2">
            <span className="font-semibold text-ink-3">Preview: </span>{preview}
          </div>
        )}
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        {ok && <div className="rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">WhatsApp message sent.</div>}
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
