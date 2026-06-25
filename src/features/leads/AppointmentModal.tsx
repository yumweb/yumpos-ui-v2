import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import {
  useLeadSources, checkCustomerExists, useCreateAppointmentCustomer, leadName, type Lead,
} from "./api";

export function AppointmentModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const open = !!lead;
  const navigate = useNavigate();
  const { data: sources } = useLeadSources();
  const create = useCreateAppointmentCustomer();
  const [gender, setGender] = useState("male");
  const [sourceId, setSourceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!lead) return;
    setGender("male");
    setSourceId(lead.leadSource?.id != null ? String(lead.leadSource.id) : (lead.fromCampaign != null ? String(lead.fromCampaign) : ""));
    setErr(""); setBusy(false);
  }, [lead]);

  if (!lead) return null;

  const goToSales = () => {
    navigate(`/sales?bookAppointment=true&phone=${encodeURIComponent(lead.mobile ?? "")}`);
    onClose();
  };

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!gender || !sourceId) return setErr("Gender and lead source are required.");
    setErr(""); setBusy(true);
    try {
      const res = await checkCustomerExists(lead!.mobile ?? "", lead!.email ?? "");
      if (res?.exist) {
        // Already a customer — go straight to the sale.
        goToSales();
        return;
      }
      await create.mutateAsync({
        firstName: lead!.firstName ?? "",
        lastName: lead!.lastName ?? "",
        email: lead!.email ?? "",
        phoneNumber: lead!.mobile ?? "",
        gender,
        sourceId,
      });
      goToSales();
    } catch {
      setErr("Could not start the appointment. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Book Appointment">
      <form onSubmit={book} className="grid gap-3 p-5">
        <p className="text-[13px] text-ink-2">Creating the customer from this lead, then opening a new sale to book the appointment.</p>
        <FieldRow label="Name"><input readOnly value={leadName(lead)} className={`${fieldCls} bg-surface-2`} /></FieldRow>
        <FieldRow label="Email"><input readOnly value={lead.email || ""} className={`${fieldCls} bg-surface-2`} /></FieldRow>
        <FieldRow label="Phone"><input readOnly value={lead.mobile || ""} className={`${fieldCls} bg-surface-2`} /></FieldRow>
        <FieldRow label="Gender" required>
          <div className="flex gap-4 text-sm">
            {["male", "female"].map((g) => (
              <label key={g} className="flex items-center gap-2 capitalize">
                <input type="radio" name="appt-gender" checked={gender === g} onChange={() => setGender(g)} className="accent-[var(--brand)]" />
                {g}
              </label>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Lead Source" required>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={fieldCls}>
            <option value="">Select…</option>
            {(sources ?? []).map((s) => <option key={String(s.id)} value={String(s.id)}>{s.source}</option>)}
          </select>
        </FieldRow>
        {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Book Appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
