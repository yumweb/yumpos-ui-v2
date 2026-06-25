import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useCreateCoupon, useCustomerSearch, COUPON_DESCRIPTIONS, type NewCouponInput } from "./api";

const EMPTY: NewCouponInput = {
  couponNumber: "", description: "", couponOption: "percentage", value: "",
  startDate: "", validityDate: "", onetime: false, minBillValue: "",
};

export function NewCouponModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [f, setF] = useState<NewCouponInput>(EMPTY);
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState("");
  const create = useCreateCoupon();
  const { data: hits } = useCustomerSearch(touched ? customerName : "");

  useEffect(() => {
    if (open) { setF(EMPTY); setCustomerName(""); setCustomerId(undefined); setTouched(false); setErr(""); }
  }, [open]);

  const set = (k: keyof NewCouponInput) => (v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.couponNumber.trim()) return setErr("Coupon number is required.");
    if (!f.description) return setErr("Please select a coupon type.");
    if (!f.value.trim()) return setErr("Value is required.");
    if (!f.startDate) return setErr("Start date is required.");
    if (!f.validityDate) return setErr("Valid-upto date is required.");
    setErr("");
    create.mutate(
      { ...f, customerId },
      {
        onSuccess: (res) => {
          if (res && (res as { statusCode?: number }).statusCode) { setErr("Could not create the coupon."); return; }
          onCreated(); onClose();
        },
        onError: () => setErr("Could not create the coupon. Check the fields and try again."),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Coupon" width="max-w-[600px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <p className="text-[13px] text-ink-2">Fields in <span className="font-semibold text-danger">red</span> are required.</p>
        <FieldRow label="Coupon Number" required>
          <input value={f.couponNumber} onChange={(e) => set("couponNumber")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Coupon Type" required>
          <select value={f.description} onChange={(e) => set("description")(e.target.value)} className={fieldCls}>
            <option value="">Select coupon type…</option>
            {COUPON_DESCRIPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Discount Mode" required>
          <select value={f.couponOption} onChange={(e) => set("couponOption")(e.target.value as NewCouponInput["couponOption"])} className={fieldCls}>
            <option value="percentage">Percentage Discount</option>
            <option value="pricevalue">Price Value</option>
          </select>
        </FieldRow>
        <FieldRow label="Value" required>
          <input inputMode="decimal" value={f.value} onChange={(e) => set("value")(e.target.value)} className={fieldCls}
            placeholder={f.couponOption === "percentage" ? "e.g. 20 (%)" : "e.g. 500 (₹)"} />
        </FieldRow>
        <FieldRow label="Min Bill Value">
          <input inputMode="decimal" value={f.minBillValue} onChange={(e) => set("minBillValue")(e.target.value)} className={fieldCls}
            placeholder="Leave empty for no minimum" />
        </FieldRow>
        <FieldRow label="Start Date" required>
          <input type="date" value={f.startDate} onChange={(e) => set("startDate")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="Valid Upto" required>
          <input type="date" value={f.validityDate} onChange={(e) => set("validityDate")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="One-time Coupon">
          <input type="checkbox" checked={f.onetime} onChange={(e) => set("onetime")(e.target.checked)}
            className="h-4 w-4 justify-self-start accent-[var(--brand)]" />
        </FieldRow>
        <FieldRow label="Customer">
          <div className="relative">
            <input
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setTouched(true); setCustomerId(undefined); }}
              placeholder="Search phone or name (optional)"
              className={fieldCls}
            />
            {touched && customerName.trim() && !customerId && (hits?.length ?? 0) > 0 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-soft">
                {hits!.map((h) => (
                  <button key={h.personId} type="button"
                    onClick={() => { setCustomerId(h.personId); setCustomerName(h.name); setTouched(false); }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                    <span className="font-medium">{h.name}</span>
                    <span className="tnum text-ink-3">{h.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </FieldRow>
        {customerId && <p className="text-xs font-medium text-ok">Linked to {customerName}.</p>}

        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Coupon
          </Button>
        </div>
      </form>
    </Modal>
  );
}
