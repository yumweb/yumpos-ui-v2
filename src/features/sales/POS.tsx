import { useMemo, useState } from "react";
import { Search, Plus, Minus, X, User, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { isApiConfigured } from "@/lib/apiClient";
import { Button, Card, Badge } from "@/components/ui/primitives";
import { useItemSearch, useCustomerByPhone, useCreateSale, customerName, type PosItem } from "./api";

/** Payment methods carried over verbatim from the existing register (config, not data). */
const PAYMENT_METHODS = [
  "Cash", "Gift Card", "Family Card", "Coupon", "Debit Card", "Credit Card",
  "Points", "Airtel Payments", "Paytm", "Deal Sites", "PhonePe", "Google Pay", "Bharat QR",
];

interface Line {
  item: PosItem;
  qty: number;
}

const mono = (name: string) =>
  name.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0])).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function POS() {
  const [keyword, setKeyword] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<string | null>("Cash");

  const search = useItemSearch(keyword);
  const customer = useCustomerByPhone(phone);
  const createSale = useCreateSale();
  const configured = isApiConfigured();

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.item.price * l.qty, 0), [lines]);

  function add(item: PosItem) {
    setLines((cur) => {
      const i = cur.findIndex((l) => l.item.id === item.id);
      if (i >= 0) {
        const next = [...cur];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...cur, { item, qty: 1 }];
    });
  }
  const setQty = (id: PosItem["id"], d: number) =>
    setLines((cur) =>
      cur.map((l) => (l.item.id === id ? { ...l, qty: Math.max(0, l.qty + d) } : l)).filter((l) => l.qty > 0)
    );
  const remove = (id: PosItem["id"]) => setLines((cur) => cur.filter((l) => l.item.id !== id));

  function complete() {
    if (!configured) {
      alert("Connect the API (VITE_API_URL / VITE_API_KEY) to complete a sale.");
      return;
    }
    // First-cut payload — must be reconciled with the backend /sales DTO.
    createSale.mutate({
      customerId: customer.data?.personId ?? customer.data?.id ?? null,
      paymentMethod: pay,
      items: lines.map((l) => ({ itemId: l.item.id, quantity: l.qty, price: l.item.price })),
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      {/* left: search-first + results + register */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-md border-2 border-brand bg-surface px-4 py-3 shadow-sm2">
          <Search className="h-5 w-5 text-ink-3" />
          <input
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search or scan item, service, package…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
          {search.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
        </div>

        {keyword.trim().length > 0 && (
          <Card className="p-4">
            {!configured ? (
              <p className="py-6 text-center text-sm text-ink-3">Connect the API to search the live catalogue.</p>
            ) : search.isLoading ? (
              <p className="py-6 text-center text-sm text-ink-3">Searching…</p>
            ) : (search.data?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-ink-3">No items match “{keyword}”.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {search.data!.map((it) => (
                  <button
                    key={String(it.id)}
                    onClick={() => add(it)}
                    className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-brand"
                  >
                    <div className="grid h-12 place-items-center rounded-md bg-brand-100 text-base font-extrabold text-brand">
                      {mono(it.name)}
                    </div>
                    <div className="text-[13.5px] font-semibold leading-tight">{it.name}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-ink-3">{it.category}</span>
                      <span className="shrink-0 font-semibold text-ink-2">{formatINR(it.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* register */}
        <Card className="flex min-h-[320px] flex-col">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <h3 className="text-[15px] font-semibold">Sale items</h3>
            <span className="text-xs text-ink-3">{lines.length} line(s)</span>
            {lines.length > 0 && (
              <button onClick={() => setLines([])} className="ml-auto text-xs font-semibold text-ink-3 hover:text-danger">
                Clear all
              </button>
            )}
          </div>
          {lines.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-3">
              Search above and tap an item to add it to the sale.
            </div>
          ) : (
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                  <th className="px-5 py-2 font-semibold">Service</th>
                  <th className="py-2 font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                  <th className="px-5"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={String(l.item.id)} className="border-t border-border">
                    <td className="px-5 py-2.5 font-semibold">{l.item.name}</td>
                    <td className="py-2.5">
                      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
                        <button onClick={() => setQty(l.item.id, -1)} className="grid h-7 w-7 place-items-center bg-surface-2 text-ink-2"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="tnum w-8 text-center font-semibold">{l.qty}</span>
                        <button onClick={() => setQty(l.item.id, 1)} className="grid h-7 w-7 place-items-center bg-surface-2 text-ink-2"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="tnum py-2.5 text-right">{formatINR(l.item.price)}</td>
                    <td className="tnum py-2.5 text-right font-semibold">{formatINR(l.item.price * l.qty)}</td>
                    <td className="px-5 text-right">
                      <button onClick={() => remove(l.item.id)} className="text-ink-3 hover:text-danger"><X className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* right: options panel */}
      <Card className="flex h-fit flex-col gap-5 p-5">
        <section className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Customer</div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
            <User className="h-4 w-4 text-ink-3" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="Customer phone number…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
            {customer.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
          </div>
          {customerName(customer.data) && (
            <div className="text-[13px] font-semibold text-ink-2">{customerName(customer.data)}</div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Bill summary</div>
          <div className="flex justify-between text-sm text-ink-2"><span>Subtotal</span><span className="tnum">{formatINR(subtotal)}</span></div>
          <div className="flex justify-between text-xs text-ink-3"><span>Taxes</span><span>Applied at checkout (location)</span></div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-lg font-bold"><span>Total</span><span className="tnum">{formatINR(subtotal)}</span></div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Payment</div>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setPay(m)}
                className={cn(
                  "rounded-md border px-2 py-2 text-center text-[11.5px] font-semibold transition-colors",
                  pay === m ? "border-brand bg-brand-100 text-brand" : "border-border bg-surface text-ink-2 hover:bg-surface-2"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Button variant="default"><Pause className="h-4 w-4" /> Suspend</Button>
          <Button variant="primary" size="lg" disabled={lines.length === 0 || createSale.isPending} onClick={complete}>
            {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Complete Sale · {formatINR(subtotal)}
          </Button>
          {createSale.isError && <p className="text-xs text-danger">Could not complete the sale. Check the API connection.</p>}
          {createSale.isSuccess && <Badge tone="ok">Sale created</Badge>}
        </div>
      </Card>
    </div>
  );
}
