import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, MapPin, ChevronRight } from "lucide-react";
import { tenant } from "@/design/tenants";
import { isApiConfigured, ApiError } from "@/lib/apiClient";
import { isAuthenticated, setToken, setSession, type StoredLocation } from "@/lib/auth";
import { Button } from "@/components/ui/primitives";
import { loginEmployee, getUserLocations, setUserLocation } from "./api";

export function LoginScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"credentials" | "location">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [locations, setLocations] = useState<StoredLocation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-8 shadow-soft">
        <div className="mb-7 flex justify-center">
          <img src={tenant.logo.onLight} alt={tenant.name} className="h-11 w-auto" />
        </div>

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
            <Button type="submit" variant="primary" size="lg" disabled={busy || !username || !password}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-sm font-semibold text-ink-2">Choose a location</p>
            {locations.length === 0 && <p className="text-sm text-ink-3">No locations available for this account.</p>}
            {locations.map((loc) => (
              <button
                key={String(loc.locationId)}
                onClick={() => chooseLocation(loc)}
                disabled={busy}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-60"
              >
                <MapPin className="h-4 w-4 text-brand" />
                <span className="flex-1 text-sm font-semibold">{loc.locationName ?? loc.name ?? `Location ${loc.locationId}`}</span>
                <ChevronRight className="h-4 w-4 text-ink-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
