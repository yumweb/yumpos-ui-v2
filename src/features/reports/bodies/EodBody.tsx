import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { Card, Button } from "@/components/ui/primitives";
import { fieldCls } from "@/components/Modal";
import { getEodPrefill, saveEodReport, type EodReport } from "../api";
import { fmtMoney } from "../dates";
import type { ParamValues } from "../types";

const AUTO: { key: keyof EodReport; label: string; money?: boolean }[] = [
  { key: "clientsHandled", label: "Clients handled" },
  { key: "todayRevenue", label: "Today's revenue", money: true },
  { key: "mtdRevenue", label: "MTD revenue", money: true },
  { key: "googleReviewsReceived", label: "Google reviews" },
  { key: "googlePhotosUploaded", label: "Google photos" },
  { key: "whatsappBroadcasts", label: "WhatsApp broadcasts" },
  { key: "membershipCardsSold", label: "Membership cards sold" },
  { key: "referralContacts", label: "Referral contacts" },
  { key: "leadsFollowupCalls", label: "Leads follow-up calls" },
  { key: "appointmentsNextDay", label: "Appointments next day" },
];
const NUMBERS: { key: keyof EodReport; label: string }[] = [
  { key: "testimonialsCollected", label: "Testimonials collected" },
  { key: "membershipCardsConvinced", label: "Membership cards convinced" },
  { key: "upsellingDone", label: "Upselling done" },
  { key: "feedbackFormsCollected", label: "Feedback forms collected" },
  { key: "instagramUpdated", label: "Instagram updates" },
  { key: "retentionCalls", label: "Retention calls" },
  { key: "staffAttendance", label: "Staff attendance & grooming" },
  { key: "customerComplaints", label: "Customer complaints" },
];
const TOGGLES: { key: keyof EodReport; label: string }[] = [
  { key: "hygieneOk", label: "Hygiene & cleanliness OK" },
  { key: "stockChecked", label: "Stock check done" },
  { key: "teamBriefingDone", label: "Morning team briefing done" },
  { key: "localMarketingDone", label: "Local marketing done" },
];

export function EodBody({ values }: { values: ParamValues }) {
  const date = (values.date as string) ?? new Date().toISOString().slice(0, 10);
  const qc = useQueryClient();
  const [form, setForm] = useState<EodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setSaved(false); setErr(null);
    getEodPrefill(date)
      .then((d) => { if (!cancelled) setForm({ ...d, reportDate: date }); })
      .catch(() => { if (!cancelled) setErr("Couldn’t load the day's data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  function set<K extends keyof EodReport>(key: K, value: EodReport[K]) { setForm((f) => (f ? { ...f, [key]: value } : f)); setSaved(false); }
  const num = (k: keyof EodReport) => Number(form?.[k] ?? 0);

  async function save() {
    if (!form) return;
    setSaving(true); setErr(null);
    try { await saveEodReport({ ...form, reportDate: date }); setSaved(true); qc.invalidateQueries({ queryKey: ["eod"] }); }
    catch (e) { setErr((e as Error)?.message || "Couldn’t save the report."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="grid min-h-[30vh] place-items-center text-ink-3"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!form) return <Card className="p-8 text-center text-ink-3">{err ?? "No data."}</Card>;

  return (
    <div className="flex flex-col gap-4">
      {form.exists === false && <div className="rounded-md bg-[var(--warn-soft)] px-3 py-2 text-sm text-warn">No report saved for this date yet. Auto-metrics are pre-filled from today's activity; complete the manual fields and save.</div>}

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold">Auto-filled metrics</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {AUTO.map((f) => (
            <div key={String(f.key)} className="rounded-md border border-border bg-surface-2 p-3">
              <div className="text-lg font-bold tnum">{f.money ? fmtMoney(num(f.key)) : num(f.key)}</div>
              <div className="mt-0.5 text-xs text-ink-3">{f.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold">Manual entry</h3>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {NUMBERS.map((f) => (
            <label key={String(f.key)} className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-2">{f.label}</span>
              <input type="number" value={String(form[f.key] ?? 0)} onChange={(e) => set(f.key, Number(e.target.value) as never)} className={fieldCls} />
            </label>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TOGGLES.map((f) => (
            <label key={String(f.key)} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={num(f.key) === 1} onChange={(e) => set(f.key, (e.target.checked ? 1 : 0) as never)} /> {f.label}
            </label>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-2">Complaints & resolution notes</span>
            <textarea rows={3} value={form.complaintsNotes ?? ""} onChange={(e) => set("complaintsNotes", e.target.value)} className={fieldCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-2">Suggestions for improvement</span>
            <textarea rows={3} value={form.suggestions ?? ""} onChange={(e) => set("suggestions", e.target.value)} className={fieldCls} /></label>
        </div>
      </Card>

      {err && <div className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">{err}</div>}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save report</Button>
        {saved && <span className="flex items-center gap-1.5 text-sm font-medium text-ok"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
      </div>
    </div>
  );
}
