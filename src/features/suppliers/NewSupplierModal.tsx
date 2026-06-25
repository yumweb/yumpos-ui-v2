import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useCreateSupplier, type NewSupplierInput } from "./api";

const EMPTY: NewSupplierInput = {
  companyName: "", firstName: "", lastName: "", phoneNumber: "", email: "",
  address1: "", address2: "", city: "", state: "", zipCode: "", country: "", comments: "",
};

export function NewSupplierModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [f, setF] = useState<NewSupplierInput>(EMPTY);
  const [err, setErr] = useState("");
  const create = useCreateSupplier();

  useEffect(() => { if (open) { setF(EMPTY); setErr(""); } }, [open]);
  const set = (k: keyof NewSupplierInput) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.companyName.trim()) return setErr("Company name is required.");
    if (f.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setErr("Please enter a valid email address.");
    if (f.phoneNumber?.trim() && !/^[\d\s\-+()]+$/.test(f.phoneNumber.trim())) return setErr("Please enter a valid phone number.");
    setErr("");
    create.mutate(f, {
      onSuccess: () => { onCreated(); onClose(); },
      onError: () => setErr("Could not create the supplier. Check the fields and try again."),
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New Supplier" width="max-w-[560px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        <p className="text-[13px] text-ink-2">Fields in <span className="font-semibold text-danger">red</span> are required.</p>
        <FieldRow label="Company Name" required>
          <input value={f.companyName} onChange={(e) => set("companyName")(e.target.value)} className={fieldCls} />
        </FieldRow>
        <FieldRow label="First Name"><input value={f.firstName} onChange={(e) => set("firstName")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Last Name"><input value={f.lastName} onChange={(e) => set("lastName")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Phone Number"><input value={f.phoneNumber} onChange={(e) => set("phoneNumber")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Email"><input type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Address 1"><input value={f.address1} onChange={(e) => set("address1")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Address 2"><input value={f.address2} onChange={(e) => set("address2")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="City"><input value={f.city} onChange={(e) => set("city")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="State"><input value={f.state} onChange={(e) => set("state")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Zip Code"><input value={f.zipCode} onChange={(e) => set("zipCode")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Country"><input value={f.country} onChange={(e) => set("country")(e.target.value)} className={fieldCls} /></FieldRow>
        <FieldRow label="Comments"><textarea rows={3} value={f.comments} onChange={(e) => set("comments")(e.target.value)} className={fieldCls} /></FieldRow>
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Supplier
          </Button>
        </div>
      </form>
    </Modal>
  );
}
