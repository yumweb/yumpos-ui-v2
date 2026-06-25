import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useUpdateGiftCard, useCustomerSearch, type GiftCard } from "./api";

const inr = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
};

export function GiftCardModal({ card, onClose, onSaved }: {
  card: GiftCard | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = !!card;
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [customerName, setCustomerName] = useState("");
  const [touchedCustomer, setTouchedCustomer] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const update = useUpdateGiftCard();
  const { data: hits } = useCustomerSearch(touchedCustomer ? customerName : "");

  useEffect(() => {
    if (!card) return;
    setNumber(card.giftcardNumber ?? "");
    setDescription(card.description ?? "");
    setCustomerId(card.person?.id ?? card.customerId);
    setCustomerName([card.person?.firstName, card.person?.lastName].filter(Boolean).join(" ").trim());
    setTouchedCustomer(false);
    setErr(""); setOk(false);
  }, [card]);

  if (!card) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim()) return setErr("Gift card number is required.");
    setErr("");
    update.mutate(
      { id: card!.id, input: { giftcardNumber: number, description, value: Number(card!.value) || 0, customerId } },
      {
        onSuccess: () => { setOk(true); onSaved(); setTimeout(onClose, 900); },
        onError: () => setErr("Could not update the gift card."),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Gift Card" width="max-w-[560px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <FieldRow label="Gift card #" required>
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

        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        {ok && <div className="rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">Gift card updated.</div>}
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
