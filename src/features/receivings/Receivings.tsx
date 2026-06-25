import { useState } from "react";
import { Search, Trash2, Loader2, Truck, X, CheckCircle2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { Button, Card } from "@/components/ui/primitives";
import {
  useSupplierMatches, useReceivingItemSearch, useCreateReceiving,
  PAYMENT_TYPES, type SupplierHit, type ReceivingLine,
} from "./api";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const numInput = "w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm tnum outline-none focus:border-brand";

export function Receivings() {
  const configured = isApiConfigured();
  const [supplier, setSupplier] = useState<SupplierHit | null>(null);
  const [supplierQ, setSupplierQ] = useState("");
  const [itemQ, setItemQ] = useState("");
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [paymentType, setPaymentType] = useState("Cash");
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const supplierHits = useSupplierMatches(supplier ? "" : supplierQ);
  const { data: itemHits } = useReceivingItemSearch(itemQ);
  const create = useCreateReceiving();

  const total = lines.reduce((t, l) => t + l.itemUnitPrice * l.quantityPurchased, 0);

  const addItem = (h: { itemId: number; name: string; costPrice: number; unitPrice: number }) => {
    setItemQ("");
    setLines((ls) => ls.some((l) => l.itemId === h.itemId) ? ls
      : [...ls, { itemId: h.itemId, name: h.name, quantityPurchased: 1, itemCostPrice: h.costPrice, itemUnitPrice: h.unitPrice }]);
  };
  const patch = (id: number, p: Partial<ReceivingLine>) =>
    setLines((ls) => ls.map((l) => l.itemId === id ? { ...l, ...p } : l));
  const remove = (id: number) => setLines((ls) => ls.filter((l) => l.itemId !== id));

  function submit() {
    if (!supplier) return setErr("Select a supplier first.");
    if (lines.length === 0) return setErr("Add at least one item.");
    for (const l of lines) if (!(l.itemCostPrice > 0)) return setErr(`${l.name}: cost price must be greater than 0.`);
    setErr("");
    create.mutate(
      { supplier: supplier.id, comment: comment.trim(), paymentType, lines },
      {
        onSuccess: (res) => {
          setDone(`Receiving #${res?.id ?? ""} recorded.`);
          setLines([]); setComment(""); setSupplier(null); setSupplierQ("");
        },
        onError: () => setErr("Could not record the receiving. Please try again."),
      }
    );
  }

  if (!configured) {
    return <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-2">Connect the API to record receivings.</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[25px] font-bold tracking-tight">Receivings</h1>

      {done && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--ok-soft)] px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="h-4 w-4" /> {done}
          <button onClick={() => setDone(null)} className="ml-auto text-ok/70 hover:text-ok"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: supplier + items */}
        <div className="flex flex-col gap-5">
          {/* Supplier */}
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold text-ink-2">Supplier</p>
            {supplier ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-brand" />
                  <span className="font-semibold">{supplier.companyName}</span>
                  {supplier.contact && <span className="text-sm text-ink-3">· {supplier.contact}</span>}
                </div>
                <button onClick={() => { setSupplier(null); setSupplierQ(""); }} className="text-ink-3 hover:text-danger"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                  <Search className="h-4 w-4 text-ink-3" />
                  <input value={supplierQ} onChange={(e) => setSupplierQ(e.target.value)} placeholder="Search supplier by name…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
                </div>
                {supplierQ.trim().length >= 2 && (supplierHits?.length ?? 0) > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface shadow-soft">
                    {supplierHits!.map((s) => (
                      <button key={s.id} type="button" onClick={() => { setSupplier(s); setSupplierQ(""); }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                        <span className="font-medium">{s.companyName}</span>
                        <span className="text-xs text-ink-3">{s.contact || `#${s.id}`}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Item search + cart */}
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold text-ink-2">Items received</p>
            <div className="relative mb-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                <Search className="h-4 w-4 text-ink-3" />
                <input value={itemQ} onChange={(e) => setItemQ(e.target.value)} placeholder="Search items to add…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
              </div>
              {itemQ.trim().length >= 2 && (itemHits?.filter((h) => !lines.some((l) => l.itemId === h.itemId)).length ?? 0) > 0 && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface shadow-soft">
                  {itemHits!.filter((h) => !lines.some((l) => l.itemId === h.itemId)).map((h) => (
                    <button key={h.itemId} type="button" onClick={() => addItem(h)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                      <span className="font-medium">{h.name}</span>
                      <span className="text-xs text-ink-3">cost {inr(h.costPrice)} · add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-[13.5px]">
                <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Item</th>
                    <th className="w-20 px-3 py-2 font-semibold">Qty</th>
                    <th className="w-28 px-3 py-2 font-semibold">Cost</th>
                    <th className="w-28 px-3 py-2 font-semibold">Unit price</th>
                    <th className="w-24 px-3 py-2 text-right font-semibold">Line</th>
                    <th className="w-10 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-3">No items yet. Search and add above.</td></tr>
                  ) : lines.map((l) => (
                    <tr key={l.itemId} className="border-t border-border">
                      <td className="px-3 py-2"><span className="text-ink-3">#{l.itemId}</span> {l.name}</td>
                      <td className="px-3 py-2">
                        <input type="number" min={1} step="1" value={l.quantityPurchased}
                          onChange={(e) => patch(l.itemId, { quantityPurchased: Number(e.target.value) })} className={numInput.replace("w-24", "w-16")} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="0.01" value={l.itemCostPrice}
                          onChange={(e) => patch(l.itemId, { itemCostPrice: Number(e.target.value) })} className={numInput} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="0.01" value={l.itemUnitPrice}
                          onChange={(e) => patch(l.itemId, { itemUnitPrice: Number(e.target.value) })} className={numInput} />
                      </td>
                      <td className="px-3 py-2 text-right tnum">{inr(l.itemUnitPrice * l.quantityPurchased)}</td>
                      <td className="px-3 py-2">
                        <button type="button" aria-label="Remove" onClick={() => remove(l.itemId)}
                          className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-[var(--danger-soft)] hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: payment + submit */}
        <Card className="h-fit p-4">
          <p className="mb-3 text-sm font-semibold text-ink-2">Payment & submit</p>
          <label className="mb-1 block text-xs font-semibold text-ink-3">Payment type</label>
          <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}
            className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
            {PAYMENT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <label className="mb-1 block text-xs font-semibold text-ink-3">Comment</label>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional"
            className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />

          <div className="mb-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-ink-2">Total</span>
            <span className="text-lg font-bold tnum">{inr(total)}</span>
          </div>

          {err && <div className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}

          <Button variant="primary" className="w-full justify-center" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Record Receiving
          </Button>
        </Card>
      </div>
    </div>
  );
}
