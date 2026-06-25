import { Modal } from "@/components/Modal";
import { Button, Badge } from "@/components/ui/primitives";
import {
  couponValueLabel, couponDiscountType, couponStatus, couponCustomerName,
  COUPON_TYPE_LABEL, type Coupon,
} from "./api";

const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = (raw?: string) => {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-ink-3">{label}:</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

export function ViewCouponModal({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  if (!coupon) return null;
  const s = couponStatus(coupon);
  const logs = coupon.couponLogs ?? [];

  return (
    <Modal open={!!coupon} onClose={onClose} title="View Coupon" width="max-w-[560px]">
      <div className="grid gap-4 p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-2 p-4 text-sm">
          <Info label="Coupon #" value={coupon.couponNumber} />
          <Info label="Value" value={couponValueLabel(coupon)} />
          <Info label="Discount type" value={couponDiscountType(coupon)} />
          <Info label="Coupon type" value={COUPON_TYPE_LABEL[coupon.couponType ?? ""] ?? "Manual"} />
          <Info label="Type label" value={coupon.description || "—"} />
          <div className="flex items-center gap-2"><span className="font-semibold text-ink-3">Status:</span><Badge tone={s.tone}>{s.label}</Badge></div>
          <Info label="Start" value={fmtDate(coupon.startDate)} />
          <Info label="Valid upto" value={fmtDate(coupon.validityDate)} />
          <Info label="Min bill" value={coupon.minBillValue != null ? `₹${coupon.minBillValue}` : "—"} />
          <Info label="One-time" value={coupon.onetime ? "Yes" : "No"} />
          <Info label="Customer" value={couponCustomerName(coupon)} />
          <Info label="Phone" value={coupon.person?.phoneNumber || "—"} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold">Coupon Log</h3>
          <div className="max-h-44 overflow-auto rounded-lg border border-border bg-surface-2 px-3 py-1">
            {logs.length === 0 ? (
              <p className="py-2 text-sm text-ink-3">No logs available.</p>
            ) : logs.map((log, i) => (
              <p key={i} className="border-b border-border/60 py-1.5 text-[13px] text-ink-2 last:border-0">
                {log.logDate && <span className="text-ink-3">{fmtDateTime(log.logDate)} · </span>}
                {(log.logMessage ?? "").replace(/<[^>]+>/g, "")}
              </p>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="default" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
