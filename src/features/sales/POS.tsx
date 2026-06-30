import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Minus, X, User, UserPlus, Users, Pause, Loader2, Check, AlertCircle,
  Pencil, MoreHorizontal, CalendarPlus, CreditCard, ClipboardList, Package, FileText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { NewCustomerModal } from "./NewCustomerModal";
import { SellCardModal } from "./SellCardModal";
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
  receiptUrl,
  lookupGiftCard,
  lookupFamilyCard,
  validateCoupon,
  redeemGiftCard,
  redeemFamilyCard,
  redeemCoupon,
  customerName,
  customerId,
  GIFT_CARD_ITEM_ID,
  FAMILY_CARD_ITEM_ID,
  type PosItem,
  type CartLine,
  type CustomerLite,
  type SpecialCard,
} from "./api";

/** Payment methods carried over verbatim from the existing register. */
const PAYMENT_METHODS = [
  "Cash", "Gift Card", "Family Card", "Coupon", "Debit Card", "Credit Card",
  "Points", "Airtel Payments", "Paytm", "Deal Sites", "PhonePe", "Google Pay", "Bharat QR",
];
/** Balance-backed methods: validated on add, redeemed post-sale (except Points). */
const REDEMPTION = new Set(["Gift Card", "Family Card", "Coupon", "Points"]);
const payTypeForApi = (m: string) => (m === "Google Pay" ? "GooglePay" : m);

interface PaymentRow {
  method: string;
  amount: number;
  /** Redemption instrument to deduct after the sale is created. */
  ref?: { kind: "giftcard" | "familycard" | "coupon"; id: number; number: string };
}

const fmtCustDate = (d?: string | null) => {
  if (!d) return "NA";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "NA" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function InfoRow({ label, value, labelClass, alt }: { label: string; value: React.ReactNode; labelClass?: string; alt?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-2", alt ? "bg-surface-2" : "bg-surface")}>
      <span className={cn("text-[13px] font-semibold", labelClass ?? "text-ink-2")}>{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

export function POS() {
  const locationId = (getLocation()?.locationId as number | string) ?? 1;
  const user = getUser<{ personId?: number | string; id?: number | string }>();
  const employeeId = Number(user?.personId ?? user?.id) || null;

  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [phone, setPhone] = useState("");
  const [payMethod, setPayMethod] = useState<string>("Cash");
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [sellCard, setSellCard] = useState<{ kind: "giftCard" | "familyCard" } | null>(null);
  const [entireDisc, setEntireDisc] = useState("");
  const [discAll, setDiscAll] = useState("");
  const [lastSaleId, setLastSaleId] = useState<number | string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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

  const loyaltyDisc = Number(customer?.loyaltyCardDiscount) || 0;
  const entireDiscNum = Math.max(0, Number(entireDisc) || 0);
  const bill = computeBill(lines, tax, entireDiscNum);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const paid = r2(payments.reduce((s, p) => s + p.amount, 0));
  const due = r2(bill.total - paid);
  const change = due < 0 ? r2(-due) : 0;

  async function addPayment() {
    const cap = r2(Number(payAmount) || (due > 0 ? due : 0));
    // Plain methods: just add the amount.
    if (!REDEMPTION.has(payMethod)) {
      if (cap <= 0) return;
      setPayments((p) => [...p, { method: payMethod, amount: cap }]);
      setPayAmount(""); setError("");
      return;
    }
    if (due <= 0) { setError("The bill is already fully paid."); return; }
    setPayBusy(true); setError("");
    try {
      if (payMethod === "Points") {
        const pts = Math.trunc(Number(customer?.points) || 0);
        const amt = r2(Math.min(pts, due, cap || due));
        if (amt <= 0) { setError("No points available to redeem."); return; }
        setPayments((p) => [...p, { method: "Points", amount: amt }]);
      } else if (payMethod === "Gift Card") {
        if (!payRef.trim()) { setError("Enter the gift card number."); return; }
        const card = await lookupGiftCard(payRef.trim());
        if (!card || card.deleted) { setError("Gift card not found."); return; }
        if (card.inactive) { setError("This gift card is inactive."); return; }
        if (card.person?.id && customer?.person?.id && Number(card.person.id) !== Number(customer.person.id)) { setError("This gift card belongs to another customer."); return; }
        const bal = Number(card.value) || 0;
        if (bal <= 0) { setError("This gift card has no balance."); return; }
        setPayments((p) => [...p, { method: "Gift Card", amount: r2(Math.min(bal, due, cap || due)), ref: { kind: "giftcard", id: card.id, number: card.giftcardNumber } }]);
      } else if (payMethod === "Family Card") {
        if (!payRef.trim()) { setError("Enter the family card number."); return; }
        const card = await lookupFamilyCard(payRef.trim());
        if (!card || card.deleted) { setError("Family card not found."); return; }
        if (card.inactive) { setError("This family card is inactive."); return; }
        if (card.validityDate && new Date(card.validityDate) < new Date(new Date().setHours(0, 0, 0, 0))) { setError("This family card has expired."); return; }
        const bal = Number(card.balance ?? card.value) || 0;
        if (bal <= 0) { setError("This family card has no balance."); return; }
        setPayments((p) => [...p, { method: "Family Card", amount: r2(Math.min(bal, due, cap || due)), ref: { kind: "familycard", id: card.id, number: card.familycardNumber } }]);
      } else if (payMethod === "Coupon") {
        if (!payRef.trim()) { setError("Enter the coupon code."); return; }
        const v = await validateCoupon(payRef.trim(), customerId(customer)!, bill.total);
        if (!v.valid || !v.coupon) { setError(v.error || "Coupon is not valid."); return; }
        const val = v.coupon.couponOption === "percentage" ? (bill.total * v.coupon.value) / 100 : v.coupon.value;
        const amt = r2(Math.min(val, due));
        if (amt <= 0) { setError("Coupon has no redeemable value."); return; }
        setPayments((p) => [...p, { method: "Coupon", amount: amt, ref: { kind: "coupon", id: v.coupon!.id, number: v.coupon!.couponNumber } }]);
      }
      setPayAmount(""); setPayRef("");
    } catch {
      setError("Couldn’t validate the payment instrument. Please try again.");
    } finally {
      setPayBusy(false);
    }
  }
  const removePayment = (i: number) => setPayments((p) => p.filter((_, j) => j !== i));

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
      // New service lines inherit the customer's loyalty-card discount.
      return [...cur, { item, qty: 1, technicianId: null, discountPercent: item.isService ? loyaltyDisc : 0 }];
    });
    setOpen(false);
  }
  function selectCustomer(c: CustomerLite) {
    setCustomer(c);
    setError("");
    const d = Number(c?.loyaltyCardDiscount) || 0;
    if (d > 0) setLines((cur) => cur.map((l) => (l.item.isService ? { ...l, discountPercent: d } : l)));
  }
  const setQty = (id: PosItem["id"], d: number) =>
    setLines((cur) => cur.map((l) => (l.item.id === id ? { ...l, qty: Math.max(0, l.qty + d) } : l)).filter((l) => l.qty > 0));
  const removeAt = (i: number) => setLines((cur) => cur.filter((_, j) => j !== i));
  const setTech = (id: PosItem["id"], techId: string) =>
    setLines((cur) => cur.map((l) => (l.item.id === id ? { ...l, technicianId: techId ? techId : null } : l)));
  const setDisc = (id: PosItem["id"], pct: number) =>
    setLines((cur) => cur.map((l) => (l.item.id === id ? { ...l, discountPercent: Math.max(0, Math.min(100, pct || 0)) } : l)));
  const applyDiscountToAll = (pct: number) =>
    setLines((cur) => cur.map((l) => (l.item.isService ? { ...l, discountPercent: Math.max(0, Math.min(100, pct || 0)) } : l)));
  function addSpecialCard(s: SpecialCard) {
    const item: PosItem = {
      id: s.kind === "giftCard" ? GIFT_CARD_ITEM_ID : FAMILY_CARD_ITEM_ID,
      name: `${s.kind === "giftCard" ? "Gift Card" : "Family Card"} #${s.number}`,
      price: s.price, category: "", isService: true, taxIncluded: true, stock: 0,
    };
    setLines((cur) => [...cur, { item, qty: 1, technicianId: null, discountPercent: 0, special: s }]);
    setError("");
  }

  /* ---- validations (parity with Sales.js) ---- */
  function validate(forSuspend: boolean): string | null {
    if (!customer) return "Please select a customer.";
    if (lines.length === 0) return "Add at least one item to the sale.";
    const zero = lines.find((l) => Number(l.item.price) === 0);
    if (zero) return `${zero.item.name} price should not be zero.`;
    if (!forSuspend) {
      const noTech = lines.find((l) => !l.special && !l.technicianId);
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
    if (suspended === 0 && payments.length > 0 && due > 0.01) {
      setError(`Collect the full amount — ${formatINR(due)} still due.`);
      return;
    }
    setError("");
    const itemTaxes = [
      { name: tax.name1, percent: tax.rate1 },
      { name: tax.name2, percent: tax.rate2 },
    ];
    const items: unknown[] = [];
    lines.forEach((l, idx) => {
      if (l.special) {
        // A card being sold: the card record entry + its charge line (id 2944/2909).
        if (l.special.kind === "giftCard") {
          items.push({ itemType: "giftCard", giftCard: { giftCardNumber: l.special.number, value: l.special.value } });
        } else {
          items.push({ itemType: "familyCard", familyCard: { familyCardNumber: l.special.number, value: l.special.value, description: l.special.number, validityDate: l.special.validityDate } });
        }
        items.push({
          itemType: "item",
          item: {
            description: l.item.name, line: idx, quantityPurchased: 1, discountPercent: 0, commission: 0,
            serviceEmployeeId: employeeId ?? 0, itemTaxes, id: l.item.id, serialNumber: 0,
            itemCostPrice: l.special.price, itemUnitPrice: l.special.price, isService: true,
          },
        });
        return;
      }
      items.push({
        itemType: "item",
        item: {
          description: l.item.name, line: idx, quantityPurchased: l.qty, discountPercent: l.discountPercent || 0, commission: 0,
          serviceEmployeeId: l.technicianId ? Number(l.technicianId) : 0, itemTaxes, id: l.item.id, serialNumber: 0,
          itemCostPrice: l.item.price, itemUnitPrice: l.item.price, isService: l.item.isService,
        },
      });
    });
    // Whole-sale fixed discount → the legacy discount line item (id 291).
    if (entireDiscNum > 0) {
      items.push({
        itemType: "item",
        item: {
          id: 291, description: "Discount", line: items.length, quantityPurchased: 1,
          discountPercent: 0, commission: 0, serviceEmployeeId: employeeId ?? 0, itemTaxes,
          serialNumber: 0, itemCostPrice: entireDiscNum, itemUnitPrice: entireDiscNum, isService: true,
        },
      });
    }
    const payload = {
      customerId: Number(customerId(customer)) || customerId(customer),
      employeeId,
      soldBy: employeeId,
      registerId: 1,
      wasAppointment: false,
      comment: note ? `V2 - ${note}` : "V2",
      showCommentOnReceipt: false,
      items,
      payments: suspended === 1
        ? []
        : payments.length > 0
          ? payments.map((p) => ({ paymentType: payTypeForApi(p.method), paymentAmount: p.amount }))
          : [{ paymentType: payTypeForApi(payMethod), paymentAmount: bill.total }],
      suspended,
      saleTime: new Date().toISOString(),
    };
    createSale.mutate(payload, {
      onSuccess: async (res) => {
        const saleId = (res as { id?: number | string })?.id ?? null;
        setLastSaleId(saleId);
        if (suspended === 0 && saleId != null) {
          // Redeem instruments now that we have a saleId (sale is already saved; best-effort).
          for (const p of payments) {
            if (!p.ref) continue;
            try {
              if (p.ref.kind === "giftcard") await redeemGiftCard(p.ref.id, { giftcardNumber: p.ref.number, redeemValue: p.amount, saleId: String(saleId) });
              else if (p.ref.kind === "familycard") await redeemFamilyCard(p.ref.id, { familyCardNumber: p.ref.number, redeemValue: p.amount, saleId: String(saleId) });
              else if (p.ref.kind === "coupon") await redeemCoupon(p.ref.id, { couponNumber: p.ref.number, redeemValue: p.amount, customerId: customerId(customer)!, billTotal: bill.total });
            } catch { /* sale saved; redemption is best-effort */ }
          }
          window.open(receiptUrl(locationId, saleId), "_blank");
        }
        setLines([]);
        setCustomer(null);
        setPhone("");
        setNote("");
        setEntireDisc("");
        setDiscAll("");
        setPayments([]);
        setPayAmount("");
        setPayRef("");
      },
    });
  }

  const detach = () => { setCustomer(null); setPhone(""); setError(""); };
  const lcNumber = customer ? `${customer.loyaltyCardNumber ?? ""} (${customer.loyaltyCardDiscount ?? ""}%)`.trim() : "";
  const selectedCustomerView = customer && (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-start justify-between bg-surface-2 px-4 py-3">
        <div>
          <div className="text-[15px] font-bold">{customerName(customer) || "Customer"}</div>
          <span className="mt-1 inline-flex text-ink-3"><Pencil className="h-4 w-4" /></span>
        </div>
        <div className="tnum text-[15px] font-bold">{customer.person?.phoneNumber ?? "—"}</div>
      </div>
      <div>
        <InfoRow label="Points" value={customer.points != null ? Math.trunc(Number(customer.points)) : 0} labelClass="text-danger" />
        <InfoRow label="LC Number" value={lcNumber || "(%)"} alt />
        <InfoRow label="Total Visits" value={customer.saleCount ?? 0} />
        <InfoRow label="Lifetime Purchase Value" value={`Rs. ${customer.lifetimeValue ?? 0}`} alt />
        <InfoRow label="Birthdate" value={fmtCustDate(customer.birthday)} />
        <InfoRow label="Anniversary" value={fmtCustDate(customer.anniversary)} alt />
      </div>
      <div className="flex items-center gap-5 border-t border-border px-4 py-3">
        <button className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <Pencil className="h-4 w-4" /> Update customer
        </button>
        <button onClick={detach} className="flex items-center gap-1.5 text-[13px] font-semibold text-danger hover:underline">
          <X className="h-4 w-4" /> Detach
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* top actions — require a selected customer */}
      {customer && (
      <div className="flex items-center justify-end gap-2">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="More actions" className="grid h-10 w-12 place-items-center rounded-md border border-border bg-surface text-ink-2 hover:bg-surface-2">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[236px] rounded-md border border-border bg-surface p-1.5 shadow-soft">
              {[
                { icon: CreditCard, label: "Sell GiftCard", onClick: () => { setMenuOpen(false); setSellCard({ kind: "giftCard" }); } },
                { icon: Users, label: "Sell FamilyCard", onClick: () => { setMenuOpen(false); setSellCard({ kind: "familyCard" }); } },
                { icon: ClipboardList, label: "Suspend Sales", onClick: () => { setMenuOpen(false); submit(1); } },
                { icon: Package, label: "Packages Sale" },
                { icon: FileText, label: "Lookup Receipt", onClick: () => { setMenuOpen(false); const id = window.prompt("Enter sale number to open its receipt"); if (id && id.trim()) window.open(receiptUrl(locationId, id.trim()), "_blank"); } },
                { icon: FileText, label: "Show last sale receipt", onClick: lastSaleId != null ? () => { setMenuOpen(false); window.open(receiptUrl(locationId, lastSaleId), "_blank"); } : undefined },
              ].map((it) => (
                <button key={it.label} onClick={it.onClick} disabled={!it.onClick} className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 disabled:opacity-50">
                  <it.icon className="h-4 w-4" /> {it.label}
                  {!it.onClick && <span className="ml-auto text-[10px] uppercase tracking-wide text-ink-3">soon</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="accent" onClick={() => navigate("/appointments")}>
          <CalendarPlus className="h-4 w-4" /> Book an appointment
        </Button>
        <Button variant="default" onClick={() => submit(1)} disabled={createSale.isPending}>
          <Pause className="h-4 w-4" /> Suspend
        </Button>
      </div>
      )}

      {/* main grid */}
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
                  <th className="py-2 font-semibold">Disc %</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                  <th className="px-5"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.special ? `${l.special.kind}-${l.special.number}` : String(l.item.id)} className="border-t border-border align-middle">
                    <td className="px-5 py-2.5 font-semibold">
                      {l.item.name}
                      {l.special?.kind === "familyCard" && l.special.value !== l.special.price && (
                        <span className="ml-1 text-xs font-normal text-ink-3">(credit {formatINR(l.special.value)})</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {l.special ? (
                        <span className="text-ink-3">—</span>
                      ) : (
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
                      )}
                    </td>
                    <td className="py-2.5">
                      {l.special ? (
                        <span className="tnum">1</span>
                      ) : (
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
                          <button onClick={() => setQty(l.item.id, -1)} className="grid h-7 w-7 place-items-center bg-surface-2 text-ink-2"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="tnum w-8 text-center font-semibold">{l.qty}</span>
                          <button onClick={() => setQty(l.item.id, 1)} className="grid h-7 w-7 place-items-center bg-surface-2 text-ink-2"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5">
                      {l.special || !l.item.isService ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        <input
                          type="number" min={0} max={100} value={l.discountPercent || ""}
                          onChange={(e) => setDisc(l.item.id, Number(e.target.value))}
                          placeholder="0"
                          className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-brand"
                        />
                      )}
                    </td>
                    <td className="tnum py-2.5 text-right">{formatINR(l.item.price)}</td>
                    <td className="tnum py-2.5 text-right font-semibold">{formatINR(l.item.price * l.qty * (1 - (l.discountPercent || 0) / 100))}</td>
                    <td className="px-5 text-right">
                      <button onClick={() => removeAt(idx)} className="text-ink-3 hover:text-danger"><X className="h-4 w-4" /></button>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewCustOpen(true)}
                  title="New customer"
                  className="grid h-[42px] w-11 shrink-0 place-items-center rounded-md bg-brand text-brand-fg transition-colors hover:bg-brand-600"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
                <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
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
              </div>
              {custSearch.data && (
                <button
                  onClick={() => selectCustomer(custSearch.data!)}
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
            {/* discounts */}
            {lines.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Discounts</div>
                {loyaltyDisc > 0 && <p className="text-xs text-ink-3">Loyalty card: {loyaltyDisc}% applied to services.</p>}
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={discAll} onChange={(e) => setDiscAll(e.target.value)} placeholder="% off all services"
                    className="h-9 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-brand" />
                  <Button variant="default" size="sm" onClick={() => applyDiscountToAll(Number(discAll))}>Apply</Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-2">Entire sale (₹ off)</span>
                  <input type="number" min={0} value={entireDisc} onChange={(e) => setEntireDisc(e.target.value)} placeholder="0"
                    className="ml-auto h-9 w-28 rounded-md border border-border bg-surface-2 px-3 text-right text-sm outline-none focus:border-brand" />
                </div>
              </section>
            )}

            {/* bill summary */}
            <section className="flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Bill summary</div>
              <div className="flex justify-between text-sm text-ink-2"><span>Subtotal</span><span className="tnum">{formatINR(bill.subtotal)}</span></div>
              {bill.discount > 0 && <div className="flex justify-between text-sm text-ok"><span>Discount</span><span className="tnum">- {formatINR(bill.discount)}</span></div>}
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
                    onClick={() => { setPayMethod(m); setPayRef(""); setError(""); }}
                    className={cn(
                      "rounded-md border px-2 py-2 text-center text-[11.5px] font-semibold transition-colors",
                      payMethod === m ? "border-brand bg-brand-100 text-brand" : "border-border bg-surface text-ink-2 hover:bg-surface-2"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {(payMethod === "Gift Card" || payMethod === "Family Card" || payMethod === "Coupon") && (
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPayment(); }}
                  placeholder={payMethod === "Coupon" ? "Coupon code" : `${payMethod} number`}
                  className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-brand"
                />
              )}
              {payMethod === "Points" && (
                <p className="text-xs text-ink-3">Available points: {Math.trunc(Number(customer?.points) || 0)}</p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPayment(); }}
                  placeholder={REDEMPTION.has(payMethod) ? "Amount (optional, max balance)" : due > 0 ? `Amount (due ${formatINR(due)})` : "Amount"}
                  className="h-9 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-brand"
                />
                <Button variant="default" size="sm" onClick={addPayment} disabled={payBusy}>{payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</Button>
              </div>
              {payments.length > 0 && (
                <div className="flex flex-col gap-1">
                  {payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm">
                      <span className="font-semibold">{p.method}</span>
                      <span className="flex items-center gap-2"><span className="tnum">{formatINR(p.amount)}</span>
                        <button onClick={() => removePayment(i)} aria-label="Remove payment" className="text-ink-3 hover:text-danger"><X className="h-3.5 w-3.5" /></button></span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 text-xs text-ink-3"><span>Paid</span><span className="tnum">{formatINR(paid)}</span></div>
                  {due > 0.01 ? (
                    <div className="flex justify-between text-xs font-bold text-warn"><span>Amount due</span><span className="tnum">{formatINR(due)}</span></div>
                  ) : change > 0 ? (
                    <div className="flex justify-between text-xs font-bold text-ok"><span>Change</span><span className="tnum">{formatINR(change)}</span></div>
                  ) : (
                    <div className="flex justify-between text-xs font-bold text-ok"><span>Fully paid</span><span /></div>
                  )}
                </div>
              )}
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
              <Button variant="primary" size="lg" disabled={createSale.isPending} onClick={() => submit(0)}>
                {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Complete Sale · {formatINR(bill.total)}
              </Button>
            </div>
          </>
        )}
      </Card>
      </div>

      <NewCustomerModal
        open={newCustOpen}
        onClose={() => setNewCustOpen(false)}
        defaultPhone={phone}
        onCreated={(c) => selectCustomer(c)}
      />

      <SellCardModal
        kind={sellCard?.kind ?? "giftCard"}
        open={sellCard != null}
        onClose={() => setSellCard(null)}
        onAdd={addSpecialCard}
      />
    </div>
  );
}
