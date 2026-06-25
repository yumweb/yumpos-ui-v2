import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useUpdateFamilyCard, useCustomerSearch, type FamilyCard, type FamilyCardLog } from "./api";

/** ISO → local YYYY-MM-DD (avoid UTC off-by-one in the date input). */
const toDateInput = (raw?: string) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const inr = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
};

/** Render a log line as plain text + a clickable receipt link (rewritten to the print host). */
function LogLine({ log, locationId }: { log: FamilyCardLog; locationId?: number }) {
  const msg = log.logMessage ?? "";
  const text = msg.replace(/<[^>]+>/g, "").trim();
  const m = msg.match(/(?:sales\/receipt|print\/\d+)\/(\d+)/);
  const saleId = m?.[1];
  const date = log.logDate
    ? new Date(log.logDate).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  return (
    <p className="border-b border-border/60 py-1.5 text-[13px] text-ink-2 last:border-0">
      {date && <span className="text-ink-3">{date} · </span>}
      {text}
      {saleId && locationId != null && (
        <a href={`https://b.studio11.co/print/${locationId}/${saleId}`} target="_blank" rel="noreferrer"
          className="ml-1 font-semibold text-brand hover:underline">View receipt</a>
      )}
    </p>
  );
}

export function FamilyCardModal({ card, onClose, onSaved }: {
  card: FamilyCard | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = !!card;
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [validityDate, setValidityDate] = useState("");
  const [inactive, setInactive] = useState(false);
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [customerName, setCustomerName] = useState("");
  const [touchedCustomer, setTouchedCustomer] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const update = useUpdateFamilyCard();
  // Only search once the user edits the customer field.
  const { data: hits } = useCustomerSearch(touchedCustomer ? customerName : "");

  useEffect(() => {
    if (!card) return;
    setNumber(card.familycardNumber ?? "");
    setDescription(card.description ?? "");
    setValidityDate(toDateInput(card.validityDate));
    setInactive(!!card.inactive);
    setCustomerId(card.person?.id ?? card.customerId);
    setCustomerName([card.person?.firstName, card.person?.lastName].filter(Boolean).join(" ").trim());
    setTouchedCustomer(false);
    setErr(""); setOk(false);
  }, [card]);

  const logs = useMemo(() => card?.familycardLogs ?? [], [card]);

  if (!card) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim()) return setErr("Family card number is required.");
    if (!validityDate) return setErr("Expiry date is required.");
    setErr("");
    update.mutate(
      { id: card!.id, input: { familycardNumber: number, description, validityDate, inactive, customerId } },
      {
        onSuccess: () => { setOk(true); onSaved(); setTimeout(onClose, 900); },
        onError: () => setErr("Could not update the family card."),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Family Card" width="max-w-[580px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <FieldRow label="Family card #" required>
          <input value={number} onChange={(e) => setNumber(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Description">
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Value">
          <input readOnly value={inr(card.value)} className={`${fieldCls} bg-surface-2`} />
        </FieldRow>
        <FieldRow label="Customer">
          <div className="relative">
            <input
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setTouchedCustomer(true); setCustomerId(undefined); }}
              placeholder="Search name…"
              className={fieldCls}
            />
            {touchedCustomer && customerName.trim() && !customerId && (hits?.length ?? 0) > 0 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-soft">
                {hits!.map((h) => (
                  <button
                    key={h.personId}
                    type="button"
                    onClick={() => { setCustomerId(h.personId); setCustomerName(h.name); setTouchedCustomer(false); }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium">{h.name}</span>
                    <span className="tnum text-ink-3">{h.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </FieldRow>
        <FieldRow label="Expiry Date" required>
          <input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Inactive">
          <input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} className="h-4 w-4 justify-self-start accent-[var(--brand)]" />
        </FieldRow>

        {logs.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-semibold text-ink-2">Family card log</p>
            <div className="max-h-48 overflow-auto rounded-md border border-border bg-surface-2 px-3 py-1">
              {logs.map((log, i) => <LogLine key={i} log={log} locationId={card.locationId} />)}
            </div>
          </div>
        )}

        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        {ok && <div className="rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">Family card updated.</div>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
