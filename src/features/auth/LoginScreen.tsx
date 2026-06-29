import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, MapPin, ChevronRight, Search } from "lucide-react";
import { tenant } from "@/design/tenants";
import { isApiConfigured, ApiError } from "@/lib/apiClient";
import { isAuthenticated, setToken, setSession, type StoredLocation } from "@/lib/auth";
import { Button } from "@/components/ui/primitives";
import { loginEmployee, getUserLocations, setUserLocation } from "./api";

const HIGHLIGHTS = ["Point of Sale", "Appointments", "Customers", "WhatsApp Engage", "Google Business", "Reports"];

export function LoginScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"credentials" | "location">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [locations, setLocations] = useState<StoredLocation[]>([]);
  const [locQuery, setLocQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const locName = (l: StoredLocation) => l.locationName ?? l.name ?? `Location ${l.locationId}`;
  const filteredLocations = locations.filter((l) => locName(l).toLowerCase().includes(locQuery.trim().toLowerCase()));

  useEffect(() => {
    if (isAuthenticated()) navigate("/home", { replace: true });
  }, [navigate]);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!isApiConfigured()) {
      setError("API not configured. Set VITE_API_URL and VITE_API_KEY.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await loginEmployee({ username, password });
      if (!res.token) {
        setError("Incorrect username or password.");
        return;
      }
      setToken(res.token); // needed so get-locations is authorized
      const locs = await getUserLocations();
      setLocations(locs.locations ?? []);
      setStep("location");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
        setError("Incorrect username or password.");
      } else {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function chooseLocation(loc: StoredLocation) {
    setError("");
    setBusy(true);
    try {
      const res = await setUserLocation(loc.locationId);
      if (!res.token) {
        setError("Could not set location. Please try again.");
        return;
      }
      setSession(res.token, loc, res.userInfo);
      navigate("/home", { replace: true });
    } catch {
      setError("Could not set location. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      {/* Form side */}
      <div className="relative grid place-items-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Logo only on mobile — desktop shows it on the brand panel */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img src={tenant.logo.onLight} alt={tenant.name} className="h-16 w-auto" />
          </div>

          <h1 className="text-center text-2xl font-bold tracking-tight lg:text-left">Welcome back</h1>
          <p className="mb-7 mt-1 text-center text-sm text-ink-2 lg:text-left">
            {step === "credentials" ? "Sign in to your Studio11 workspace." : "Choose a location to continue."}
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={submitCredentials} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink-2">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  className="h-11 rounded-md border border-border bg-surface-2 px-3 text-sm outline-none focus:border-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink-2">Password</span>
                <div className="flex h-11 items-center rounded-md border border-border bg-surface-2 px-3 focus-within:border-brand">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="text-ink-3" aria-label="Toggle password">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <Button type="submit" variant="primary" size="lg" className="mt-1" disabled={busy || !username || !password}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              {locations.length === 0 ? (
                <p className="text-sm text-ink-3">No locations available for this account.</p>
              ) : (
                <>
                  <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 focus-within:border-brand">
                    <Search className="h-4 w-4 text-ink-3" />
                    <input
                      value={locQuery}
                      onChange={(e) => setLocQuery(e.target.value)}
                      autoFocus
                      placeholder="Search locations…"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
                    />
                  </div>
                  <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1">
                    {filteredLocations.length === 0 ? (
                      <p className="px-1 py-2 text-sm text-ink-3">No locations match “{locQuery}”.</p>
                    ) : (
                      filteredLocations.map((loc) => (
                        <button
                          key={String(loc.locationId)}
                          onClick={() => chooseLocation(loc)}
                          disabled={busy}
                          className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-60"
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-brand" />
                          <span className="flex-1 text-sm font-semibold">{locName(loc)}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <p className="mt-10 text-center text-xs text-ink-3 lg:text-left">© {tenant.name} · powered by YumPOS</p>
        </div>
      </div>
    </div>
  );
}

/** Decorative branded panel (desktop only) — gradient, soft glows and the logo's wave motif. */
function BrandPanel() {
  return (
    <div
      className="relative hidden overflow-hidden lg:block"
      style={{ background: "linear-gradient(150deg, var(--brand-dark) 0%, var(--brand) 52%, var(--brand-600) 100%)" }}
    >
      {/* soft glows */}
      <div className="pointer-events-none absolute -left-24 -top-28 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 68%)", opacity: 0.22 }} />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-600), transparent 70%)", opacity: 0.55 }} />

      {/* large wave watermark echoing the logo */}
      <WaveMark className="pointer-events-none absolute -right-10 top-1/2 h-[120%] w-[120%] -translate-y-1/2 opacity-[0.07]" />
      {/* footer wave band */}
      <WaveMark className="pointer-events-none absolute inset-x-0 -bottom-8 h-64 w-full opacity-20" />

      <div className="relative z-10 flex h-full flex-col p-12 xl:p-16">
        <img src={tenant.logo.onDark} alt={tenant.name} className="h-auto w-[230px] max-w-[55%]" />

        <div className="flex flex-1 flex-col justify-center">
          <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.75rem]">
            Run your salon,<br />beautifully.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
            Sales, appointments, inventory, customers, WhatsApp engagement and Google Business, all in one calm, fast workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {HIGHLIGHTS.map((h) => (
              <span key={h} className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Studio11 gold/plum wave, used as a decorative watermark. */
function WaveMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 200" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d="M-20 130 C 120 40, 220 40, 320 110 S 520 150, 640 70" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" />
      <path d="M-20 165 C 120 75, 220 75, 320 145 S 520 185, 640 105" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}
