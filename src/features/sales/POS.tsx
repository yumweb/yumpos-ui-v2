import { useEffect, useRef, useState } from "react";
import { Search, Plus, Minus, X, User, Pause, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { isApiConfigured } from "@/lib/apiClient";
import { getLocation, getUser } from "@/lib/auth";
import { Button, Card, Badge } from "@/components/ui/primitives";
import {
  useItemSearch,
  useCategoryNames,
  useCustomerByPhone,
  useCreateSale,
  useLocation,
  parseTechnicians,
  parseTaxConfig,
  computeBill,
  customerName,
  customerId,
  type PosItem,
  type CartLine,
  type CustomerLite,
} from "./api";

/** Payment methods carried over verbatim from the existing register. */
const PAYMENT_METHODS = [
  "Cash", "Gift Card", "Family Card", "Coupon", "Debit Card", "Credit Card",
  "Points", "Airtel Payments", "Paytm", "Deal Sites", "PhonePe", "Google Pay", "Bharat QR",
];

export function POS() {
  const locationId = (getLocation()?.locationId as number | string) ?? 1;
  const user = getUser<{ personId?: number | string; id?: number | string }>();
  const employeeId = user?.personId ?? user?.id ?? null;

  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<string>("Cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const configured = isApiConfigured();
  const search = useItemSearch(keyword);
  const cats = useCategoryNames();
  const catMap = cats.data ?? new Map<string, string>();
  const loc = useLocation(locationId);
  const technicians = parseTechnicians(loc.data);
  const tax = parseTaxConfig(loc.data);
  const custSearch = useCustomerByPhone(phone);
  const createSale = useCreateSale();

  const bill = computeBill(lines, tax);

  /* ---- cart ops ---- */
  function add(item: PosItem) {
    setError("");
    setLines((cur) => {
      const i = cur.findIndex((l) => l.item.id === item.id);
      if (i >= 0) {
        const next = [...cur];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...cur, { item, qty: 1, technicianId: null }];
    });
    setOpen(false);
  }
  const setQty = (id: PosItem["id"], d: number) =>
    setLines((cur) => cur.map((l) => (l.item.id === id ? { ...l, qty: Math.max(0, l.qty + d) } : l)).filter((l) => l.qty > 0));
  const remove = (id: PosItem["id"]) => setLines((cur) => cur.filter((l) => l.item.id !== id));
  const setTech = (id: PosItem["id"], techId: string) =>
    setLines((cur) => cur.map((l) => (l.item.id === id ? { ...l, technicianId: techId ? techId : null } : l)));

  /* ---- validations (parity with Sales.js) ---- */
  function validate(forSuspend: boolean): string | null {
    if (!customer) return "Please select a customer.";
    if (lines.length === 0) return "Add at least one item to the sale.";
    const zero = lines.find((l) => Number(l.item.price) === 0);
    if (zero) return `${zero.item.name} price should not be zero.`;
    if (!forSuspend) {
      const noTech = lines.find((l) => !l.technicianId);
      if (noTech) return "Select a technician for every item in the cart.";
    }
    return null;
  }

  function submit(suspended: 0 | 1) {
    const err = validate(suspended === 1);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    const itemTaxes = [
      { name: tax.name1, percent: tax.rate1 },
      { name: tax.name2, percent: tax.rate2 },
    ];
    const payload = {
      customerId: customerId(customer),
      employeeId,
      soldBy: employeeId,
      registerId: 1,
      wasAppointment: false,
      comment: note ? `V2 - ${note}` : "V2",
      showCommentOnReceipt: false,
      items: lines.map((l, idx) => ({
        itemType: "item",
        item: {
          description: l.item.name,
          line: idx,
          quantityPurchased: l.qty,
          discountPercent: 0,
          commission: 0,
          serviceEmployeeId: l.technicianId ?? 0,
          itemTaxes,
          id: l.item.id,
          serialNumber: 0,
          itemCostPrice: l.item.price,
          itemUnitPrice: l.item.price,
          isService: l.item.isService,
        },
      })),
      payments: suspended === 1 ? [] : [{ paymentType: pay === "Google Pay" ? "GooglePay" : pay, paymentAmount: bill.total }],
      suspended,
      saleTime: new Date().toISOString(),
    };
    createSale.mutate(payload, {
      onSuccess: () => {
        setLines([]);
        setCustomer(null);
        setPhone("");
        setNote("");
      },
    });
  }

  const selectedCustomerView = customer && (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <User className="mt-0.5 h-4 w-4 text-brand" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{customerName(customer) || "Customer"}</div>
        <div className="text-xs text-ink-3">
          {customer.person?.phoneNumber ?? "—"}
          {customer.loyaltyCardNumber ? ` · ${customer.loyaltyCardNumber}` : ""}
          {customer.points != null ? ` · ${customer.points} pts` : ""}
        </div>
      </div>
      <button
        onClick={() => { setCustomer(null); setPhone(""); }}
        className="text-xs font-semibold text-brand hover:underline"
      >
        Change
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_372px]">
      {/* left: search-first + results + register */}
      <div className="flex flex-col gap-4">
        <div className="relative" ref={searchRef}>
          <div className="flex items-center gap-2 rounded-md border-2 border-brand bg-surface px-4 py-3 shadow-sm2">
            <Search className="h-5 w-5 text-ink-3" />
            <input
              autoFocus
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setOpen(e.target.value.trim().length > 0); }}
              onFocus={() => keyword.trim().length > 0 && setOpen(true)}
              placeholder="Search or scan item, service, package…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            />
            {search.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
          </div>

          {open && keyword.trim().length > 0 && (
            <Card className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden shadow-soft">
              {!configured ? (
                <p className="p-6 text-center text-sm text-ink-3">Connect the API to search the live catalogue.</p>
              ) : search.isLoading ? (
                <p className="p-6 text-center text-sm text-ink-3">Searching…</p>
              ) : (search.data?.length ?? 0) === 0 ? (
                <p className="p-6 text-center text-sm text-ink-3">No items match “{keyword}”.</p>
              ) : (
                <div className="max-h-[58vh] divide-y divide-border overflow-auto">
                  {search.data!.map((it) => {
                    const parent = it.categoryParentId != null ? catMap.get(String(it.categoryParentId)) : undefined;
                    const meta = `${it.isService ? "Service" : "Retail Product"} · ${it.category || "NA"}${parent ? " › " + parent : ""}`;
                    return (
                      <button key={String(it.id)} onClick={() => add(it)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold">{it.name}</div>
                          <div className="truncate text-xs text-ink-3">
                            {meta}
                            {!it.isService && <span className="text-ink-2"> · Stock: {it.stock}</span>}
                          </div>
                        </div>
                        <div className="tnum shrink-0 font-semibold">{formatINR(it.price)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* register */}
        <Card className="flex min-h-[320px] flex-col">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <h3 className="text-[15px] font-semibold">Sale items</h3>
            <span className="text-xs text-ink-3">{lines.length} line(s)</span>
            {lines.length > 0 && (
              <button onClick={() => setLines([])} className="ml-auto text-xs font-semibold text-ink-3 hover:text-danger">Clear all</button>
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
                  <th className="px-5 py-2 font-semibold">Item</th>
                  <th className="py-2 font-semibold">Technician</th>
                  <th className="py-2 font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                  <th className="px-5"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={String(l.item.id)} className="border-t border-border align-middle">
                    <td className="px-5 py-2.5 font-semibold">{l.item.name}</td>
                    <td className="py-2.5">
                      <select
                        value={l.technicianId ?? ""}
                        onChange={(e) => setTech(l.item.id, e.target.value)}
                        className={cn(
                          "rounded-md border bg-surface px-2 py-1.5 text-[13px] outline-none",
                          l.technicianId ? "border-border" : "border-danger text-danger"
                        )}
                      >
                        <option value="">Assign…</option>
                        {technicians.map((t) => (
                          <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
                        ))}
                      </select>
                    </td>
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
        {/* customer — selection is mandatory */}
        <section className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Customer *</div>
          {customer ? (
            selectedCustomerView
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
                <User className="h-4 w-4 text-ink-3" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Customer phone number…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
                />
                {custSearch.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
              </div>
              {custSearch.data && (
                <button
                  onClick={() => { setCustomer(custSearch.data!); setError(""); }}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-brand"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{customerName(custSearch.data) || "Customer"}</div>
                    <div className="text-xs text-ink-3">{custSearch.data.person?.phoneNumber ?? phone}</div>
                  </div>
                  <span className="text-xs font-semibold text-brand">Select</span>
                </button>
              )}
              {custSearch.isError && phone.replace(/\D/g, "").length >= 10 && (
                <p className="text-xs text-ink-3">No customer found for this number.</p>
              )}
            </>
          )}
        </section>

        {!customer ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-ink-3">
            <AlertCircle className="h-4 w-4" />
            Select a customer to see the bill and take payment.
          </div>
        ) : (
          <>
            {/* bill summary */}
            <section className="flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Bill summary</div>
              <div className="flex justify-between text-sm text-ink-2"><span>Subtotal</span><span className="tnum">{formatINR(bill.subtotal)}</span></div>
              <div className="flex justify-between text-xs text-ink-3"><span>{tax.name1} {tax.rate1}%</span><span className="tnum">{formatINR(bill.cgst)}</span></div>
              <div className="flex justify-between text-xs text-ink-3"><span>{tax.name2} {tax.rate2}%</span><span className="tnum">{formatINR(bill.sgst)}</span></div>
              <div className="mt-1 flex justify-between border-t border-border pt-2 text-lg font-bold"><span>Total</span><span className="tnum">{formatINR(bill.total)}</span></div>
            </section>

            {/* payment */}
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

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note to the sale…"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-ink-3"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {createSale.isError && <p className="text-xs text-danger">Could not save the sale. Check the API connection.</p>}
            {createSale.isSuccess && <Badge tone="ok"><Check className="h-3.5 w-3.5" /> Sale saved</Badge>}

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="default" disabled={createSale.isPending} onClick={() => submit(1)}>
                <Pause className="h-4 w-4" /> Suspend
              </Button>
              <Button variant="primary" size="lg" disabled={createSale.isPending} onClick={() => submit(0)}>
                {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Complete Sale · {formatINR(bill.total)}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
