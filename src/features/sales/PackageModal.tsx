import { useEffect, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PackageLine } from "./api";

/** Configure a package before adding it: tick services used now + assign a technician. */
export function PackageModal({ pkg, technicians, open, onClose, onAdd }: {
  pkg: PackageLine | null;
  technicians: { id: number | string; name: string }[];
  open: boolean;
  onClose: () => void;
  onAdd: (pkg: PackageLine) => void;
}) {
  const [services, setServices] = useState<PackageLine["services"]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    setServices(pkg ? pkg.services.map((s) => ({ ...s })) : []);
    setErr("");
  }, [pkg]);

  if (!pkg) return null;

  const toggle = (i: number, redeemed: boolean) =>
    setServices((cur) => cur.map((s, j) => (j === i ? { ...s, redeemed, technicianId: redeemed ? s.technicianId : null } : s)));
  const setTech = (i: number, id: string) =>
    setServices((cur) => cur.map((s, j) => (j === i ? { ...s, technicianId: id || null } : s)));

  function confirm() {
    const missing = services.find((s) => s.redeemed && !s.technicianId);
    if (missing) { setErr(`Assign a technician for “${missing.name}”.`); return; }
    onAdd({ ...pkg!, services });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Package · ${pkg.name}`}>
      <div className="space-y-3 p-5">
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-2">Package price</span>
          <span className="font-semibold">{formatINR(pkg.unitPrice)}</span>
        </div>
        <p className="text-xs text-ink-3">Tick the services being used now and assign a technician. Anything left unticked stays on the package for later redemption.</p>
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {services.length === 0 && <p className="px-3 py-4 text-center text-sm text-ink-3">This package has no listed services.</p>}
          {services.map((s, i) => (
            <div key={`${s.itemId}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
              <input type="checkbox" checked={s.redeemed} onChange={(e) => toggle(i, e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                {s.quantity > 1 && <p className="text-xs text-ink-3">Qty {s.quantity}</p>}
              </div>
              {s.redeemed && (
                <select
                  value={s.technicianId ?? ""}
                  onChange={(e) => setTech(i, e.target.value)}
                  className={cn("rounded-md border bg-surface px-2 py-1.5 text-[13px] outline-none", s.technicianId ? "border-border" : "border-danger text-danger")}
                >
                  <option value="">Assign…</option>
                  {technicians.map((t) => <option key={String(t.id)} value={String(t.id)}>{t.name}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={confirm}>Add to sale</Button>
      </div>
    </Modal>
  );
}
