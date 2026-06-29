import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { getLocation } from "@/lib/auth";
import { useLocationDetail } from "@/features/locations/api";
import {
  sendTicketOtp, verifyTicketOtp, useCreateStaffTicket, useCreateTrainingTicket, useCreateExitTicket,
} from "./api";
import { STAFF_TYPES, STAFF_LEVELS, TRAINING_FOR, DESIGNATIONS } from "./constants";

type Tab = "staffing" | "training" | "exit";

const EMPTY_STAFF = { staffType: "", staffGender: "", staffLevel: "junior", ticketsTargetDate: "", staffRequestType: "", subject: "", message: "", accept: false };
const EMPTY_TRAIN = { trainingFor: "", ticketsTargetDate: "", subject: "", message: "" };
const EMPTY_EXIT = { candidateName: "", candidateEmail: "", candidatePhoneNumber: "", candidateDesignation: "", joiningDate: "", relievingDate: "", leavingReason: "", noticePeriod: "", candidateSalary: "", companyReviewCandidate: "", otherCommentsCandidate: "" };

export function NewTicketModal({ open, onClose, onCreated, initialTab = "staffing" }: {
  open: boolean; onClose: () => void; onCreated: () => void; initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [staff, setStaff] = useState({ ...EMPTY_STAFF });
  const [train, setTrain] = useState({ ...EMPTY_TRAIN });
  const [exit, setExit] = useState({ ...EMPTY_EXIT });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const { data: loc } = useLocationDetail(open ? Number(getLocation()?.locationId) : null, open);
  const createStaff = useCreateStaffTicket();
  const createTrain = useCreateTrainingTicket();
  const createExit = useCreateExitTicket();

  useEffect(() => {
    if (!open) return;
    setTab(initialTab); setStaff({ ...EMPTY_STAFF }); setTrain({ ...EMPTY_TRAIN }); setExit({ ...EMPTY_EXIT });
    setOtpSent(false); setOtp(""); setErr(""); setOk(""); setBusy(false);
  }, [open, initialTab]);

  if (!open) return null;

  const owner = {
    name: String(loc?.ownerName ?? ""),
    email: String((loc as Record<string, unknown> | undefined)?.ticketsEmail ?? loc?.ownerEmail ?? ""),
    phone: String((loc as Record<string, unknown> | undefined)?.ticketsContact ?? loc?.ownerContact ?? ""),
  };
  const salary = STAFF_TYPES.find((s) => String(s.value) === staff.staffType)?.salary ?? "";

  function validate(): string {
    if (tab === "staffing") {
      const s = staff;
      if (!s.staffType || !s.staffGender || !s.staffLevel || !s.ticketsTargetDate || !s.staffRequestType || !s.subject.trim() || !s.message.trim()) return "Fill all required fields.";
      if (!s.accept) return "Please accept the salary range.";
    } else if (tab === "training") {
      const t = train;
      if (!t.trainingFor || !t.ticketsTargetDate || !t.subject.trim() || !t.message.trim()) return "Fill all required fields.";
    } else {
      const e = exit;
      if (!e.candidateName.trim() || !/^\d{1,10}$/.test(e.candidatePhoneNumber) || !e.candidateDesignation || !e.joiningDate || !e.relievingDate || !e.leavingReason.trim() || !e.noticePeriod || !e.candidateSalary || !e.companyReviewCandidate.trim() || !e.otherCommentsCandidate.trim()) return "Fill all required fields.";
    }
    return "";
  }

  async function send() {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(""); setBusy(true);
    try { await sendTicketOtp(); setOtpSent(true); setOk("OTP sent. Enter it below to create the ticket."); }
    catch { setErr("Could not send OTP. Try again."); }
    finally { setBusy(false); }
  }

  async function verifyAndCreate() {
    setBusy(true); setErr(""); setOk("");
    try {
      const res = await verifyTicketOtp(otp.trim());
      if (!res?.valid) { setErr("Invalid OTP."); setBusy(false); return; }
      if (tab === "staffing") {
        await createStaff.mutateAsync({
          staffType: Number(staff.staffType), staffGender: staff.staffGender as "male" | "female",
          staffLevel: staff.staffLevel, ticketsTargetDate: staff.ticketsTargetDate, ticketsGracePeriod: 10,
          staffRequestType: Number(staff.staffRequestType) as 1 | 2, subject: staff.subject.trim(),
          message: staff.message.trim(), salaryRange: salary,
        });
      } else if (tab === "training") {
        await createTrain.mutateAsync({ trainingFor: train.trainingFor, ticketsTargetDate: train.ticketsTargetDate, subject: train.subject.trim(), message: train.message.trim() });
      } else {
        await createExit.mutateAsync({
          candidateName: exit.candidateName.trim(), candidateEmail: exit.candidateEmail.trim(), candidatePhoneNumber: exit.candidatePhoneNumber,
          candidateDesignation: Number(exit.candidateDesignation), joiningDate: exit.joiningDate, relievingDate: exit.relievingDate,
          leavingReason: exit.leavingReason.trim(), noticePeriod: Number(exit.noticePeriod), candidateSalary: Number(exit.candidateSalary),
          companyReviewCandidate: exit.companyReviewCandidate.trim(), otherCommentsCandidate: exit.otherCommentsCandidate.trim(),
        });
      }
      onCreated(); onClose();
    } catch { setErr("Could not create the ticket. Try again."); }
    finally { setBusy(false); }
  }

  const sel = (k: keyof typeof staff) => (v: string | boolean) => setStaff((s) => ({ ...s, [k]: v }));
  const tr = (k: keyof typeof train) => (v: string) => setTrain((s) => ({ ...s, [k]: v }));
  const ex = (k: keyof typeof exit) => (v: string) => setExit((s) => ({ ...s, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="New Ticket" width="max-w-[620px]">
      <div className="p-5">
        {/* Tabs */}
        <div className="mb-4 flex items-center rounded-md border border-border bg-surface p-0.5">
          {(["staffing", "training", "exit"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setOtpSent(false); setErr(""); setOk(""); }}
              className={cn("flex-1 rounded px-3 py-1.5 text-sm font-semibold capitalize", tab === t ? "bg-brand-100 text-brand" : "text-ink-2 hover:bg-surface-2")}>
              {t === "exit" ? "Staff Exit" : t}
            </button>
          ))}
        </div>

        {/* Owner (read-only, from location) */}
        <div className="mb-3 grid gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <FieldRow label="Owner"><input readOnly value={owner.name} className={`${fieldCls} bg-surface`} /></FieldRow>
          <FieldRow label="Email"><input readOnly value={owner.email} className={`${fieldCls} bg-surface`} /></FieldRow>
          <FieldRow label="Phone"><input readOnly value={owner.phone} className={`${fieldCls} bg-surface`} /></FieldRow>
        </div>

        <div className="grid gap-3">
          {tab === "staffing" && (
            <>
              <FieldRow label="Type of Staff" required>
                <select value={staff.staffType} onChange={(e) => sel("staffType")(e.target.value)} className={fieldCls}>
                  <option value="">Select…</option>
                  {STAFF_TYPES.map((s) => <option key={s.value} value={String(s.value)}>{s.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Staff Gender" required>
                <select value={staff.staffGender} onChange={(e) => sel("staffGender")(e.target.value)} className={fieldCls}>
                  <option value="">Select…</option><option value="male">Male</option><option value="female">Female</option>
                </select>
              </FieldRow>
              <FieldRow label="Staff Level" required>
                <select value={staff.staffLevel} onChange={(e) => sel("staffLevel")(e.target.value)} className={fieldCls}>
                  {STAFF_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Target Date" required><input type="date" value={staff.ticketsTargetDate} onChange={(e) => sel("ticketsTargetDate")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Replacement?" required>
                <select value={staff.staffRequestType} onChange={(e) => sel("staffRequestType")(e.target.value)} className={fieldCls}>
                  <option value="">Select…</option><option value="2">Yes</option><option value="1">No</option>
                </select>
              </FieldRow>
              <FieldRow label="Subject" required><input value={staff.subject} onChange={(e) => sel("subject")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Message" required><textarea rows={3} value={staff.message} onChange={(e) => sel("message")(e.target.value)} className={fieldCls} /></FieldRow>
              {salary && (
                <>
                  <FieldRow label="Salary Range"><input readOnly value={salary} className={`${fieldCls} bg-surface-2`} /></FieldRow>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={staff.accept} onChange={(e) => sel("accept")(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" /> I accept the salary range.</label>
                </>
              )}
            </>
          )}

          {tab === "training" && (
            <>
              <FieldRow label="Training For" required>
                <select value={train.trainingFor} onChange={(e) => tr("trainingFor")(e.target.value)} className={fieldCls}>
                  <option value="">Select…</option>
                  {TRAINING_FOR.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Target Date" required><input type="date" value={train.ticketsTargetDate} onChange={(e) => tr("ticketsTargetDate")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Subject" required><input value={train.subject} onChange={(e) => tr("subject")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Message" required><textarea rows={3} value={train.message} onChange={(e) => tr("message")(e.target.value)} className={fieldCls} /></FieldRow>
            </>
          )}

          {tab === "exit" && (
            <>
              <FieldRow label="Candidate Name" required><input value={exit.candidateName} onChange={(e) => ex("candidateName")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Candidate Email"><input type="email" value={exit.candidateEmail} onChange={(e) => ex("candidateEmail")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Candidate Phone" required><input inputMode="numeric" value={exit.candidatePhoneNumber} onChange={(e) => ex("candidatePhoneNumber")(e.target.value.replace(/\D/g, "").slice(0, 10))} className={fieldCls} /></FieldRow>
              <FieldRow label="Designation" required>
                <select value={exit.candidateDesignation} onChange={(e) => ex("candidateDesignation")(e.target.value)} className={fieldCls}>
                  <option value="">Select…</option>
                  {DESIGNATIONS.map((d) => <option key={d.value} value={String(d.value)}>{d.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Joining Date" required><input type="date" value={exit.joiningDate} onChange={(e) => ex("joiningDate")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Relieving Date" required><input type="date" value={exit.relievingDate} onChange={(e) => ex("relievingDate")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Notice Period (days)" required><input inputMode="numeric" value={exit.noticePeriod} onChange={(e) => ex("noticePeriod")(e.target.value.replace(/\D/g, ""))} className={fieldCls} /></FieldRow>
              <FieldRow label="Salary (monthly)" required><input inputMode="numeric" value={exit.candidateSalary} onChange={(e) => ex("candidateSalary")(e.target.value.replace(/\D/g, ""))} className={fieldCls} /></FieldRow>
              <FieldRow label="Reason for Leaving" required><textarea rows={2} value={exit.leavingReason} onChange={(e) => ex("leavingReason")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Performance Review" required><textarea rows={2} value={exit.companyReviewCandidate} onChange={(e) => ex("companyReviewCandidate")(e.target.value)} className={fieldCls} /></FieldRow>
              <FieldRow label="Other Comments" required><textarea rows={2} value={exit.otherCommentsCandidate} onChange={(e) => ex("otherCommentsCandidate")(e.target.value)} className={fieldCls} /></FieldRow>
            </>
          )}
        </div>

        {/* OTP gate */}
        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
          {!otpSent ? (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-ink-2"><ShieldCheck className="h-4 w-4 text-brand" /> Creating a ticket requires OTP verification.</span>
              <Button type="button" variant="primary" onClick={send} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send OTP</Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <label className="flex-1">
                <span className="mb-1 block text-xs font-semibold text-ink-3">Enter OTP</span>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" className={fieldCls} />
              </label>
              <Button type="button" variant="default" onClick={send} disabled={busy}>Resend</Button>
              <Button type="button" variant="primary" onClick={verifyAndCreate} disabled={busy || !otp.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify & Create</Button>
            </div>
          )}
        </div>

        {err && <div className="mt-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        {ok && !err && <div className="mt-3 rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">{ok}</div>}

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
