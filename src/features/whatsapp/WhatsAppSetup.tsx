import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle, Plug } from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { isAdmin } from "@/lib/auth";
import { useWhatsAppEsu } from "./useWhatsAppEsu";
import { getPhoneStatus, getOnboardingHealth, registerPhone, deregisterPhone, type PhoneStatus, type OnboardingHealth } from "./api";

type Notice = { tone: "ok" | "danger"; text: string } | null;

/** WhatsApp Business connection panel — status, registration, and connect flow. */
export function WhatsAppSetup() {
  const admin = isAdmin();
  const { loading: esuLoading, error: esuError, launch } = useWhatsAppEsu();

  const [initialLoading, setInitialLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [registrationPin, setRegistrationPin] = useState<string | null>(null);
  const [health, setHealth] = useState<OnboardingHealth | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [registering, setRegistering] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusData, setStatusData] = useState<PhoneStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [checks, setChecks] = useState({ policies: false, number: false, account: false });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deregOpen, setDeregOpen] = useState(false);
  const [deregPassword, setDeregPassword] = useState("");
  const [deregBusy, setDeregBusy] = useState(false);

  async function refreshStatus() {
    try {
      const d = await getPhoneStatus();
      if (d?.status === "PENDING" && d?.registration_pin) {
        setNeedsRegistration(true); setConnected(false); setRegistrationPin(d.registration_pin);
      } else if (d?.status === "CONNECTED" || (d?.verified_name && d?.status !== "PENDING")) {
        setConnected(true); setNeedsRegistration(false);
        setConnectedPhone(d.display_phone_number || d.verified_name || null);
        if (d.registration_pin) setRegistrationPin(d.registration_pin);
      } else {
        setConnected(false); setNeedsRegistration(false);
      }
    } catch {
      setConnected(false); setNeedsRegistration(false);
    }
  }

  useEffect(() => {
    (async () => {
      await refreshStatus();
      getOnboardingHealth().then(setHealth).catch(() => {});
      setInitialLoading(false);
    })();
  }, []);

  async function handleRegister() {
    if (!registrationPin) return;
    setRegistering(true); setNotice(null);
    try {
      await registerPhone(registrationPin);
      setNotice({ tone: "ok", text: "Phone number registered successfully." });
      await refreshStatus();
    } catch (e) {
      setNotice({ tone: "danger", text: (e as Error)?.message || "Registration failed." });
    } finally { setRegistering(false); }
  }

  async function openStatus() {
    setStatusOpen(true); setStatusLoading(true); setStatusData(null);
    try { setStatusData(await getPhoneStatus()); }
    catch { setStatusData(null); }
    finally { setStatusLoading(false); }
  }

  async function handleDeregister() {
    if (!deregPassword) return;
    setDeregBusy(true); setNotice(null);
    try {
      await deregisterPhone(deregPassword);
      setNotice({ tone: "ok", text: "WhatsApp number deregistered." });
      setConnected(false); setConnectedPhone(null);
      setDeregOpen(false); setDeregPassword("");
    } catch (e) {
      setNotice({ tone: "danger", text: (e as Error)?.message || "Deregistration failed." });
    } finally { setDeregBusy(false); }
  }

  const allChecked = checks.policies && checks.number && checks.account;

  return (
    <div>
      {esuError && <Banner tone="danger">{String(esuError)}</Banner>}
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}

      {initialLoading ? (
        <div className="flex items-center gap-2 text-sm text-ink-3"><Loader2 className="h-4 w-4 animate-spin" /> Checking connection status…</div>
      ) : needsRegistration ? (
        <>
          <Banner tone="warn"><strong>Registration pending.</strong> Your account setup is complete, but the phone number needs registration. This usually happens automatically within a few minutes — register manually if it doesn’t.</Banner>
          {registrationPin && (
            <div className="mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
              <span className="text-ink-2">Registration PIN:</span> <code className="font-bold tracking-widest">{registrationPin}</code>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleRegister} disabled={registering || !registrationPin}>
              {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Register phone manually
            </Button>
            <Button variant="default" onClick={openStatus}>Check status</Button>
          </div>
        </>
      ) : connected ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-ok" />
            <span className="font-semibold">WhatsApp Business is connected</span>
            {connectedPhone && <Badge tone="ok">{connectedPhone}</Badge>}
          </div>
          <Button variant="default" onClick={openStatus}>Check status</Button>
          {admin && (
            <div className="mt-4">
              <button onClick={() => setShowAdvanced((s) => !s)} className="text-xs font-medium text-ink-3 hover:text-ink">
                {showAdvanced ? "Hide advanced options" : "Show advanced options"}
              </button>
              {showAdvanced && (
                <div className="mt-2 rounded-md bg-surface-2 p-3">
                  <p className="mb-1 text-xs font-semibold text-ink-3">Danger zone</p>
                  <button onClick={() => setDeregOpen(true)} className="text-sm font-semibold text-danger hover:underline">Deregister WhatsApp number…</button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {health?.phoneStatus === "deregistered" && (
            <Banner tone="warn">WhatsApp is currently disconnected for this location. Click <strong>Connect WhatsApp</strong> to re-onboard.</Banner>
          )}
          {(health?.hasStuckAttempt || health?.hasCancelledAttempt) && health?.phoneStatus !== "deregistered" && (
            <Banner tone="default">A previous onboarding attempt didn’t complete. Try again and keep the popup open until it returns to YumPOS.</Banner>
          )}
          <p className="mb-3 text-sm">Connect this location to WhatsApp Business via Embedded Signup.</p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={esuLoading} onClick={() => setOnboardOpen(true)}>
              {esuLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Connect WhatsApp
            </Button>
            <Button variant="default" onClick={openStatus}>Check status</Button>
          </div>
        </>
      )}

      {/* Phone status dialog */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="WhatsApp phone status">
        <div className="p-5">
          {statusLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-ink-3" /></div>
          ) : statusData ? (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(statusData).filter(([k, v]) => k !== "health_status" && (v === null || typeof v !== "object")).map(([k, v]) => (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3 font-semibold text-ink-2">{k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                    <td className="py-1.5">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink-3">No data available.</p>
          )}
        </div>
      </Modal>

      {/* Onboarding prerequisites */}
      <Modal open={onboardOpen} onClose={() => setOnboardOpen(false)} title="WhatsApp Business integration" width="max-w-[640px]">
        <div className="space-y-3 p-5">
          <Banner tone="default"><strong>Disclaimer:</strong> YumPOS connects your business to Meta’s WhatsApp Business API. All billing, pricing and policies are managed directly by Meta and subject to change.</Banner>
          <div className="rounded-md border border-border">
            {[
              ["Dedicated phone number", "A number NOT currently registered on any WhatsApp service (personal or business app)."],
              ["Number access", "Ability to receive SMS or calls on that number for verification."],
              ["Facebook Business account", "Required for WhatsApp Business API access."],
              ["Valid payment method", "Credit card or payment method linked to Meta Business Manager."],
              ["Business display name", "Your business name as it will appear to customers."],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-3 border-b border-border px-3 py-2 text-sm last:border-0">
                <span className="w-40 shrink-0 font-semibold">{t}</span><span className="text-ink-2">{d}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 pt-1">
            {([["policies", "I understand WhatsApp pricing and policies are controlled by Meta, not YumPOS"],
              ["number", "I have a dedicated phone number ready for WhatsApp Business API"],
              ["account", "I have access to a Facebook Business account with a valid payment method"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={checks[key]} onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))} className="mt-0.5" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => setOnboardOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!allChecked} onClick={() => { setOnboardOpen(false); setChecks({ policies: false, number: false, account: false }); launch(); }}>
            Proceed with onboarding
          </Button>
        </div>
      </Modal>

      {/* Deregister confirmation */}
      <Modal open={deregOpen} onClose={() => setDeregOpen(false)} title="Deregister WhatsApp number">
        <div className="space-y-3 p-5">
          <Banner tone="warn"><AlertTriangle className="mr-1 inline h-4 w-4" /> Messaging will stop immediately. The number stays in your WhatsApp Business Account and can be re-registered later (max 10 register/deregister attempts per number in 72 hours).</Banner>
          {registrationPin && (
            <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
              <span className="text-ink-2">Save your Registration PIN:</span> <code className="font-bold tracking-widest">{registrationPin}</code>
            </div>
          )}
          <FieldRow label="Password" required>
            <input type="password" value={deregPassword} onChange={(e) => setDeregPassword(e.target.value)} autoComplete="current-password" className={fieldCls} placeholder="Enter your password to confirm" />
          </FieldRow>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => setDeregOpen(false)} disabled={deregBusy}>Cancel</Button>
          <Button variant="danger" onClick={handleDeregister} disabled={deregBusy || !deregPassword}>
            {deregBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Yes, deregister
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Banner({ tone, children }: { tone: "ok" | "warn" | "danger" | "default"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-[var(--ok-soft)] text-ok",
    warn: "bg-[var(--warn-soft)] text-warn",
    danger: "bg-[var(--danger-soft)] text-danger",
    default: "bg-surface-2 text-ink-2",
  }[tone];
  return <div className={`mb-3 rounded-md px-3 py-2 text-sm ${cls}`}>{children}</div>;
}
