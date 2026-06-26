import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useLocationDetail, useUpdateLocation, type Location } from "./api";

/** Editable store-config fields (the genuinely useful subset of the location entity). */
const FIELDS: Array<{ key: keyof Location; label: string; section?: string }> = [
  { key: "name", label: "Name", section: "Store" },
  { key: "address", label: "Address" },
  { key: "area", label: "Area" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "timezone", label: "Timezone" },
  { key: "storeCode", label: "Store Code" },
  { key: "taxName1", label: "Tax 1 Name", section: "Taxes" },
  { key: "taxRate1", label: "Tax 1 Rate (%)" },
  { key: "taxName2", label: "Tax 2 Name" },
  { key: "taxRate2", label: "Tax 2 Rate (%)" },
  { key: "serviceTaxNumber", label: "Service Tax No." },
  { key: "ownerName", label: "Owner Name", section: "Owner" },
  { key: "ownerContact", label: "Owner Contact" },
  { key: "ownerEmail", label: "Owner Email" },
];

type Form = Record<string, string>;

export function LocationModal({ editId, onClose, onSaved }: {
  editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const open = editId != null;
  const { data: detail, isLoading } = useLocationDetail(editId, open);
  const update = useUpdateLocation();
  const [f, setF] = useState<Form>({});
  const [orig, setOrig] = useState<Form>({});
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!open || !detail) return;
    const seed: Form = {};
    for (const { key } of FIELDS) seed[key as string] = detail[key] != null ? String(detail[key]) : "";
    setF(seed); setOrig(seed); setErr(""); setOk(false);
  }, [open, detail]);

  if (!open) return null;

  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name?.trim()) return setErr("Name is required.");
    const changed: Record<string, unknown> = {};
    for (const { key } of FIELDS) {
      const k = key as string;
      if ((f[k] ?? "") !== (orig[k] ?? "")) changed[k] = f[k];
    }
    if (Object.keys(changed).length === 0) return setErr("No changes to save.");
    setErr("");
    update.mutate({ id: editId!, fields: changed }, {
      onSuccess: () => { setOk(true); onSaved(); setTimeout(onClose, 900); },
      onError: () => setErr("Could not update the location."),
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Location" width="max-w-[620px]">
      <form onSubmit={submit} className="grid gap-3 p-5">
        {isLoading ? (
          <div className="py-8 text-center text-ink-3">Loading…</div>
        ) : (
          <>
            {FIELDS.map(({ key, label, section }) => (
              <div key={key as string}>
                {section && <p className="mb-2 mt-1 border-t border-border pt-3 text-sm font-semibold text-ink-2">{section}</p>}
                <FieldRow label={label} required={key === "name"}>
                  <input value={f[key as string] ?? ""} onChange={(e) => set(key as string)(e.target.value)} className={fieldCls} />
                </FieldRow>
              </div>
            ))}
            {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
            {ok && <div className="rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">Location updated.</div>}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
