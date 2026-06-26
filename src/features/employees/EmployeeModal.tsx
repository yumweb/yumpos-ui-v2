import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { isAdmin } from "@/lib/auth";
import {
  useUserLocations, useEmployeeDetail, useCreateEmployee, useUpdateEmployee,
} from "./api";

interface Form {
  firstName: string; lastName: string; phoneNumber: string; email: string;
  employeeGender: string; employeeType: string;
  userName: string; password: string; passwordAgain: string;
}
const EMPTY: Form = {
  firstName: "", lastName: "", phoneNumber: "", email: "",
  employeeGender: "", employeeType: "", userName: "", password: "", passwordAgain: "",
};

export function EmployeeModal({ open, editPersonId, onClose, onSaved }: {
  open: boolean; editPersonId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = editPersonId != null;
  const admin = isAdmin();
  const [f, setF] = useState<Form>(EMPTY);
  const [locs, setLocs] = useState<number[]>([]);
  const [origLocs, setOrigLocs] = useState<number[]>([]);
  const [err, setErr] = useState("");

  const { data: locations } = useUserLocations();
  const { data: detail, isLoading: detailLoading } = useEmployeeDetail(editPersonId, open && isEdit);
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setErr("");
    if (isEdit && detail) {
      const p = detail.person ?? {};
      setF({
        firstName: p.firstName ?? "", lastName: p.lastName ?? "", phoneNumber: p.phoneNumber ?? "",
        email: p.email ?? "", employeeGender: detail.employeeGender != null ? String(detail.employeeGender) : "",
        employeeType: detail.employeeType ?? detail.role ?? "",
        userName: detail.username ?? "", password: "", passwordAgain: "",
      });
      const ls = (detail.locations ?? []).map((l) => l.locationId);
      setLocs(ls); setOrigLocs(ls);
    } else if (!isEdit) {
      setF(EMPTY); setLocs([]); setOrigLocs([]);
    }
  }, [open, isEdit, detail]);

  const set = (k: keyof Form) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const toggleLoc = (id: number) => setLocs((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);

  const { added, removed } = useMemo(() => ({
    added: locs.filter((l) => !origLocs.includes(l)),
    removed: origLocs.filter((l) => !locs.includes(l)),
  }), [locs, origLocs]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.firstName.trim()) return setErr("First name is required.");
    if (!f.lastName.trim()) return setErr("Last name is required.");
    if (!/^\d{1,10}$/.test(f.phoneNumber.trim())) return setErr("A valid phone number is required.");
    if (!f.employeeGender) return setErr("Gender is required.");
    if (admin && !f.employeeType) return setErr("Employee type is required.");
    if (!isEdit) {
      if (!f.userName.trim()) return setErr("Username is required.");
      if (!f.password) return setErr("Password is required.");
      if (f.password !== f.passwordAgain) return setErr("Passwords do not match.");
    }
    if (locs.length === 0) return setErr("Assign at least one location.");
    setErr("");

    if (isEdit && editPersonId != null) {
      const fields: Record<string, unknown> = {};
      const p = detail?.person ?? {};
      if (f.firstName.trim() !== (p.firstName ?? "")) fields.firstName = f.firstName.trim();
      if (f.lastName.trim() !== (p.lastName ?? "")) fields.lastName = f.lastName.trim();
      if (f.email.trim() !== (p.email ?? "")) fields.email = f.email.trim();
      if (f.phoneNumber.trim() !== (p.phoneNumber ?? "")) fields.phoneNumber = f.phoneNumber.trim();
      if (f.employeeGender !== String(detail?.employeeGender ?? "")) fields.employeeGender = Number(f.employeeGender);
      if (admin && f.employeeType !== (detail?.employeeType ?? detail?.role ?? "")) fields.employeeType = f.employeeType;
      if (Object.keys(fields).length === 0 && added.length === 0 && removed.length === 0) {
        return setErr("No changes to save.");
      }
      update.mutate({ personId: editPersonId, fields, addedLocations: added, removedLocations: removed }, {
        onSuccess: () => { onSaved(); onClose(); },
        onError: () => setErr("Could not update the employee."),
      });
    } else {
      create.mutate({
        firstName: f.firstName, lastName: f.lastName, phoneNumber: f.phoneNumber, email: f.email,
        employeeGender: f.employeeGender, employeeType: admin ? f.employeeType : undefined,
        userName: f.userName, password: f.password, employeeLocation: locs,
      }, {
        onSuccess: () => { onSaved(); onClose(); },
        onError: () => setErr("Could not create the employee. The username may already exist."),
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Employee" : "New Employee"} width="max-w-[600px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        {isEdit && detailLoading ? (
          <div className="py-8 text-center text-ink-3">Loading…</div>
        ) : (
          <>
            <p className="text-[13px] text-ink-2">Fields in <span className="font-semibold text-danger">red</span> are required.</p>
            <FieldRow label="First Name" required><input value={f.firstName} onChange={(e) => set("firstName")(e.target.value)} className={fieldCls} /></FieldRow>
            <FieldRow label="Last Name" required><input value={f.lastName} onChange={(e) => set("lastName")(e.target.value)} className={fieldCls} /></FieldRow>
            <FieldRow label="Phone Number" required>
              <input inputMode="numeric" value={f.phoneNumber}
                onChange={(e) => set("phoneNumber")(e.target.value.replace(/\D/g, "").slice(0, 10))} className={fieldCls} />
            </FieldRow>
            <FieldRow label="Email"><input type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} className={fieldCls} /></FieldRow>
            <FieldRow label="Gender" required>
              <div className="flex gap-4 text-sm">
                {[["1", "Male"], ["2", "Female"]].map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2">
                    <input type="radio" name="emp-gender" checked={f.employeeGender === v} onChange={() => set("employeeGender")(v)} className="accent-[var(--brand)]" />{l}
                  </label>
                ))}
              </div>
            </FieldRow>
            {admin && (
              <FieldRow label="Employee Type" required>
                <div className="flex gap-4 text-sm">
                  {[["admin", "Admin"], ["user", "User"]].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2">
                      <input type="radio" name="emp-type" checked={f.employeeType === v} onChange={() => set("employeeType")(v)} className="accent-[var(--brand)]" />{l}
                    </label>
                  ))}
                </div>
              </FieldRow>
            )}

            <div className="mt-1 border-t border-border pt-3">
              <p className="mb-2 text-sm font-semibold text-ink-2">Login details</p>
              <div className="grid gap-3">
                <FieldRow label="Username" required>
                  <input value={f.userName} onChange={(e) => set("userName")(e.target.value)} disabled={isEdit}
                    className={`${fieldCls} ${isEdit ? "bg-surface-2 text-ink-3" : ""}`} />
                </FieldRow>
                {!isEdit && (
                  <>
                    <FieldRow label="Password" required><input type="password" value={f.password} onChange={(e) => set("password")(e.target.value)} className={fieldCls} /></FieldRow>
                    <FieldRow label="Confirm Password" required><input type="password" value={f.passwordAgain} onChange={(e) => set("passwordAgain")(e.target.value)} className={fieldCls} /></FieldRow>
                  </>
                )}
              </div>
            </div>

            <div className="mt-1 border-t border-border pt-3">
              <p className="mb-2 text-sm font-semibold text-danger">Locations *</p>
              <div className="grid max-h-44 grid-cols-2 gap-1 overflow-auto rounded-lg border border-border p-2 sm:grid-cols-3">
                {(locations ?? []).map((l) => (
                  <label key={l.locationId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2">
                    <input type="checkbox" checked={locs.includes(l.locationId)} onChange={() => toggleLoc(l.locationId)} className="h-4 w-4 accent-[var(--brand)]" />
                    <span className="truncate">{l.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {isEdit ? "Save changes" : "Create employee"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
