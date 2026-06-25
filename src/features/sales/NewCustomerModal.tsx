import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";
import { useCreateCustomer, useUpdateCustomer, type CustomerLite } from "./api";

export interface EditTarget {
  id?: number | string;
  gender?: string | number;
  person?: {
    firstName?: string; lastName?: string; email?: string; phoneNumber?: string;
    address1?: string; address2?: string; city?: string; state?: string; zip?: string; country?: string; comments?: string;
  };
}

type Form = {
  firstName: string; lastName: string; email: string; phoneNumber: string; gender: string;
  address1: string; address2: string; city: string; state: string; zip: string; country: string; comments: string;
};
const EMPTY: Form = {
  firstName: "", lastName: "", email: "", phoneNumber: "", gender: "",
  address1: "", address2: "", city: "", state: "", zip: "", country: "", comments: "",
};

function Field({ label, required, value, onChange, type = "text", textarea }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean;
}) {
  const cls = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand";
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-3">
      <span className={cn("text-sm font-semibold", required ? "text-danger" : "text-ink-2")}>
        {label}{required ? " *" : ""}
      </span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={cls} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
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
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setErr("");
    if (editCustomer) {
      const p = editCustomer.person ?? {};
      setF({
        firstName: p.firstName ?? "", lastName: p.lastName ?? "", email: p.email ?? "",
        phoneNumber: p.phoneNumber ?? "", gender: editCustomer.gender != null ? String(editCustomer.gender) : "",
        address1: p.address1 ?? "", address2: p.address2 ?? "", city: p.city ?? "",
        state: p.state ?? "", zip: p.zip ?? "", country: p.country ?? "", comments: p.comments ?? "",
      });
    } else {
      setF({ ...EMPTY, phoneNumber: defaultPhone ?? "" });
    }
  }, [open, defaultPhone, editCustomer]);

  if (!open) return null;
  const set = (k: keyof Form) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.firstName.trim()) return setErr("First name is required.");
    if (!f.phoneNumber.trim()) return setErr("Phone number is required.");
    if (!f.gender) return setErr("Gender is required.");
    setErr("");
    const onSuccess = (res?: { id?: number | string; personId?: number | string; person?: { id?: number | string } }) => {
      const pid = res?.personId ?? res?.person?.id ?? editCustomer?.id;
      onCreated({
        id: res?.id ?? editCustomer?.id,
        personId: pid,
        person: { id: pid, firstName: f.firstName.trim(), lastName: f.lastName.trim(), phoneNumber: f.phoneNumber.trim() },
        points: 0, saleCount: 0, lifetimeValue: 0,
        loyaltyCardNumber: null, loyaltyCardDiscount: null, birthday: null, anniversary: null,
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
      <div onMouseDown={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[560px] overflow-auto rounded-lg border border-border bg-surface shadow-soft">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Customer" : "New Customer"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={submit} className="grid gap-3 p-5">
          <p className="text-[13px] text-ink-2">Customer information <span className="font-semibold text-danger">(fields in red are required)</span></p>
          <Field label="First Name" required value={f.firstName} onChange={set("firstName")} />
          <Field label="Last Name" value={f.lastName} onChange={set("lastName")} />
          <Field label="E-mail" type="email" value={f.email} onChange={set("email")} />
          <Field label="Phone Number" required value={f.phoneNumber} onChange={set("phoneNumber")} />
          <label className="grid grid-cols-[120px_1fr] items-center gap-3">
            <span className="text-sm font-semibold text-danger">Gender *</span>
            <select
              value={f.gender}
              onChange={(e) => set("gender")(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
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
