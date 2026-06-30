import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { formatINR } from "@/lib/format";
import type { SpecialCard } from "./api";

/** Family-card default packages (legacy register): pay `price`, card credited `value`. */
const FAMILY_PRESETS = [
  { label: "Silver — pay ₹10,000, credit ₹13,000", price: 10000, value: 13000, months: 3 },
  { label: "Gold — pay ₹15,000, credit ₹20,000", price: 15000, value: 20000, months: 6 },
  { label: "Diamond — pay ₹20,000, credit ₹30,000", price: 20000, value: 30000, months: 9 },
  { label: "Platinum — pay ₹30,000, credit ₹50,000", price: 30000, value: 50000, months: 12 },
];

const addMonths = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return d.toISOString();
};

export function SellCardModal({ kind, open, onClose, onAdd }: {
  kind: "giftCard" | "familyCard";
  open: boolean;
  onClose: () => void;
  onAdd: (card: SpecialCard) => void;
}) {
  const isGift = kind === "giftCard";
  const [number, setNumber] = useState("");
  const [value, setValue] = useState("");
  const [preset, setPreset] = useState<string>("custom");
  const [validityMonths, setValidityMonths] = useState("6");
  const [err, setErr] = useState("");

  function reset() { setNumber(""); setValue(""); setPreset("custom"); setValidityMonths("6"); setErr(""); }
  function close() { reset(); onClose(); }

  function submit() {
    if (!number.trim()) { setErr("Enter the card number."); return; }
    if (isGift) {
      const v = Number(value);
      if (!v || v <= 0) { setErr("Enter a valid amount."); return; }
      onAdd({ kind: "giftCard", number: number.trim(), value: v, price: v });
      close();
      return;
    }
    // family card
    if (preset !== "custom") {
      const p = FAMILY_PRESETS.find((x) => x.label === preset)!;
      onAdd({ kind: "familyCard", number: number.trim(), value: p.value, price: p.price, validityDate: addMonths(p.months) });
      close();
      return;
    }
    const v = Number(value);
    if (!v || v <= 0) { setErr("Enter a valid amount."); return; }
    onAdd({ kind: "familyCard", number: number.trim(), value: v, price: v, validityDate: addMonths(Number(validityMonths) || 6) });
    close();
  }

  return (
    <Modal open={open} onClose={close} title={isGift ? "Sell gift card" : "Sell family card"}>
      <div className="space-y-3 p-5">
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
        <FieldRow label="Card number" required>
          <input value={number} onChange={(e) => setNumber(e.target.value)} className={fieldCls} placeholder={isGift ? "GC0001" : "FC0001"} autoFocus />
        </FieldRow>

        {!isGift && (
          <FieldRow label="Package">
            <select value={preset} onChange={(e) => setPreset(e.target.value)} className={fieldCls}>
              <option value="custom">Custom</option>
              {FAMILY_PRESETS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
          </FieldRow>
        )}

        {(isGift || preset === "custom") && (
          <FieldRow label={isGift ? "Amount" : "Card value"} required>
            <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className={fieldCls} placeholder="0" />
          </FieldRow>
        )}

        {!isGift && preset === "custom" && (
          <FieldRow label="Valid for">
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={validityMonths} onChange={(e) => setValidityMonths(e.target.value)} className={`${fieldCls} max-w-[90px]`} />
              <span className="text-sm text-ink-2">months</span>
            </div>
          </FieldRow>
        )}

        {!isGift && preset !== "custom" && (() => {
          const p = FAMILY_PRESETS.find((x) => x.label === preset)!;
          return <p className="pl-[142px] text-xs text-ink-3">Customer pays {formatINR(p.price)} · card credited {formatINR(p.value)} · valid {p.months} months.</p>;
        })()}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Add to sale</Button>
      </div>
    </Modal>
  );
}
