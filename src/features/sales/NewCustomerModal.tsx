import { useEffect, useState } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";
import { useLeadSources } from "@/features/customers/api";
import { useCreateCustomer, useUpdateCustomer, type CustomerLite } from "./api";

export interface EditTarget {
  id?: number | string;
  gender?: string | number;
  birthday?: string | null;
  anniversary?: string | null;
  loyaltyCardNumber?: string | null;
  loyaltyCardDiscount?: number | string | null;
  currentSpendForPoints?: number | string | null;
  points?: number | string | null;
  sourceId?: number | string | null;
  dndSms?: boolean | number | null;
  dndEmail?: boolean | number | null;
  person?: {
    firstName?: string; lastName?: string; email?: string; phoneNumber?: string;
    address1?: string; address2?: string; city?: string; state?: string; zip?: string; country?: string; comments?: string;
  };
}

type Form = {
  firstName: string; lastName: string; email: string; phoneNumber: string; gender: string;
  address1: string; address2: string; city: string; state: string; zip: string; country: string; comments: string;
  birthday: string; anniversary: string;
  loyaltyCardNumber: string; loyaltyCardDiscount: string; currentSpendForPoints: string; points: string;
  companyAddress: string; sourceId: string; dndSms: boolean; dndEmail: boolean;
};
const EMPTY: Form = {
  firstName: "", lastName: "", email: "", phoneNumber: "", gender: "",
  address1: "", address2: "", city: "", state: "", zip: "", country: "", comments: "",
  birthday: "", anniversary: "",
  loyaltyCardNumber: "", loyaltyCardDiscount: "", currentSpendForPoints: "", points: "",
  companyAddress: "", sourceId: "", dndSms: false, dndEmail: false,
};

// CRA loyalty card tiers (value = discount %).
const LOYALTY_TIERS: Array<{ v: string; label: string }> = [
  { v: "", label: "Loyalty Card Type" },
  { v: "5", label: "5% Loyalty Card" },
  { v: "10", label: "10% Loyalty Card" },
  { v: "15", label: "15% Loyalty Card" },
  { v: "18", label: "18% Loyalty Card" },
  { v: "20", label: "20% Loyalty Card" },
  { v: "25", label: "25% Loyalty Card" },
  { v: "30", label: "Privileged Card (30% Discount)" },
  { v: "40", label: "40% Loyalty Card" },
  { v: "50", label: "VIP Card (50% Discount)" },
];

const inputCls = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

function Field({ label, required, value, onChange, type = "text", textarea, placeholder }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  type?: string; textarea?: boolean; placeholder?: string;
}) {
  return (
    <label className="grid grid-cols-[140px_1fr] items-center gap-3">
      <span className={cn("text-sm font-semibold", required ? "text-danger" : "text-ink-2")}>
        {label}{required ? " *" : ""}
      </span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className={inputCls} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      )}
    </label>
  );
}

function Section({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-surface-2 px-4 py-3 text-left text-sm font-bold hover:bg-surface-2/70"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="grid gap-3 border-t border-border p-4">{children}</div>}
    </div>
  );
}

export function NewCustomerModal({ open, onClose, defaultPhone, editCustomer, onCreated }: {
  open: boolean;
  onClose: () => void;
  defaultPhone?: string;
  editCustomer?: EditTarget | null;
  onCreated: (c: CustomerLite) => void;
}) {
  const isEdit = !!editCustomer;
  const [f, setF] = useState<Form>(EMPTY);
  const [err, setErr] = useState("");
  const [panel, setPanel] = useState({ info: true, dates: false, loyalty: false, company: false });
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const { data: leadSources } = useLeadSources();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setErr("");
    setPanel({ info: true, dates: false, loyalty: false, company: false });
    if (editCustomer) {
      const p = editCustomer.person ?? {};
      const str = (v: unknown) => (v == null ? "" : String(v));
      setF({
        firstName: p.firstName ?? "", lastName: p.lastName ?? "", email: p.email ?? "",
        phoneNumber: p.phoneNumber ?? "", gender: editCustomer.gender != null ? String(editCustomer.gender) : "",
        address1: p.address1 ?? "", address2: p.address2 ?? "", city: p.city ?? "",
        state: p.state ?? "", zip: p.zip ?? "", country: p.country ?? "", comments: p.comments ?? "",
        birthday: (editCustomer.birthday ?? "").slice(0, 10), anniversary: (editCustomer.anniversary ?? "").slice(0, 10),
        loyaltyCardNumber: str(editCustomer.loyaltyCardNumber),
        loyaltyCardDiscount: editCustomer.loyaltyCardDiscount ? String(editCustomer.loyaltyCardDiscount) : "",
        currentSpendForPoints: editCustomer.currentSpendForPoints != null ? String(Number(editCustomer.currentSpendForPoints)) : "",
        points: editCustomer.points != null ? String(editCustomer.points) : "",
        companyAddress: "",
        sourceId: editCustomer.sourceId != null ? String(editCustomer.sourceId) : "",
        dndSms: Boolean(editCustomer.dndSms), dndEmail: Boolean(editCustomer.dndEmail),
      });
    } else {
      setF({ ...EMPTY, phoneNumber: defaultPhone ?? "" });
    }
  }, [open, defaultPhone, editCustomer]);

  if (!open) return null;
  const set = (k: keyof Form) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (k: keyof typeof panel) => setPanel((s) => ({ ...s, [k]: !s[k] }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.firstName.trim()) { setPanel((s) => ({ ...s, info: true })); return setErr("First name is required."); }
    if (!f.phoneNumber.trim()) { setPanel((s) => ({ ...s, info: true })); return setErr("Phone number is required."); }
    if (!f.gender) { setPanel((s) => ({ ...s, info: true })); return setErr("Gender is required."); }
    if (!f.sourceId) { setPanel((s) => ({ ...s, company: true })); return setErr("Lead from campaign is required."); }
    setErr("");
    const onSuccess = (res?: { id?: number | string; personId?: number | string; person?: { id?: number | string } }) => {
      const pid = res?.personId ?? res?.person?.id ?? editCustomer?.id;
      onCreated({
        id: res?.id ?? editCustomer?.id,
        personId: pid,
        person: { id: pid, firstName: f.firstName.trim(), lastName: f.lastName.trim(), phoneNumber: f.phoneNumber.trim() },
        points: Number(f.points) || 0, saleCount: 0, lifetimeValue: 0,
        loyaltyCardNumber: f.loyaltyCardNumber || null,
        loyaltyCardDiscount: f.loyaltyCardDiscount ? Number(f.loyaltyCardDiscount) : null,
        birthday: f.birthday || null, anniversary: f.anniversary || null,
      });
      onClose();
    };
    const onError = () => setErr(`Could not ${isEdit ? "update" : "create"} the customer. Check the fields and try again.`);
    if (isEdit && editCustomer?.id != null) {
      update.mutate({ id: editCustomer.id, input: f }, { onSuccess, onError });
    } else {
      create.mutate(f, { onSuccess, onError });
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-[600px] overflow-auto rounded-lg border border-border bg-surface shadow-soft">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Customer" : "New Customer"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={submit} className="grid gap-3 p-5">
          <Section title="Customer Information" open={panel.info} onToggle={() => toggle("info")}>
            <p className="text-[13px] text-ink-2">Fields in <span className="font-semibold text-danger">red</span> are required.</p>
            <Field label="First Name" required value={f.firstName} onChange={set("firstName")} />
            <Field label="Last Name" value={f.lastName} onChange={set("lastName")} />
            <Field label="E-mail" type="email" value={f.email} onChange={set("email")} />
            <Field label="Phone Number" required value={f.phoneNumber} onChange={set("phoneNumber")} />
            <label className="grid grid-cols-[140px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-danger">Gender *</span>
              <select value={f.gender} onChange={(e) => set("gender")(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="0">Male</option>
                <option value="1">Female</option>
                <option value="2">Other</option>
              </select>
            </label>
            <Field label="Address 1" value={f.address1} onChange={set("address1")} />
            <Field label="Address 2" value={f.address2} onChange={set("address2")} />
            <Field label="City" value={f.city} onChange={set("city")} />
            <Field label="State/Province" value={f.state} onChange={set("state")} />
            <Field label="Zip" value={f.zip} onChange={set("zip")} />
            <Field label="Country" value={f.country} onChange={set("country")} />
            <Field label="Comments" textarea value={f.comments} onChange={set("comments")} />
          </Section>

          <Section title="Birthdays & Anniversary" open={panel.dates} onToggle={() => toggle("dates")}>
            <Field label="Birthday" type="date" value={f.birthday} onChange={set("birthday")} />
            <Field label="Anniversary" type="date" value={f.anniversary} onChange={set("anniversary")} />
          </Section>

          <Section title="Loyalty Management" open={panel.loyalty} onToggle={() => toggle("loyalty")}>
            <Field label="Loyalty Card Number" value={f.loyaltyCardNumber} onChange={set("loyaltyCardNumber")} placeholder="LC 000 000" />
            <label className="grid grid-cols-[140px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-ink-2">Loyalty Card Discount</span>
              <select value={f.loyaltyCardDiscount} onChange={(e) => set("loyaltyCardDiscount")(e.target.value)} className={inputCls}>
                {LOYALTY_TIERS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </label>
            <Field label="Amount To Spend For Next Point" type="number" value={f.currentSpendForPoints} onChange={set("currentSpendForPoints")} placeholder="100.00" />
            <Field label="Points" type="number" value={f.points} onChange={set("points")} placeholder="0" />
          </Section>

          <Section title="Company and Tax Settings" open={panel.company} onToggle={() => toggle("company")}>
            {!isEdit && <Field label="Address" textarea value={f.companyAddress} onChange={set("companyAddress")} />}
            <label className="grid grid-cols-[140px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-danger">Lead From Campaign *</span>
              <select value={f.sourceId} onChange={(e) => set("sourceId")(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {(leadSources ?? []).map((s) => <option key={String(s.id)} value={String(s.id)}>{s.source}</option>)}
              </select>
            </label>
            <label className="grid grid-cols-[140px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-ink-2">Activate DND for SMS</span>
              <input type="checkbox" checked={f.dndSms} onChange={(e) => setF((s) => ({ ...s, dndSms: e.target.checked }))} className="h-4 w-4 justify-self-start accent-[var(--brand)]" />
            </label>
            <label className="grid grid-cols-[140px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-ink-2">Activate DND for E-mails</span>
              <input type="checkbox" checked={f.dndEmail} onChange={(e) => setF((s) => ({ ...s, dndEmail: e.target.checked }))} className="h-4 w-4 justify-self-start accent-[var(--brand)]" />
            </label>
          </Section>

          {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isEdit ? "Save changes" : "Create customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
