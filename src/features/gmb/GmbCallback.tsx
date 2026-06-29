import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { connectGmb } from "./api";

/** Google OAuth redirect lands here with ?code & ?state(=locationId). */
export function GmbCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [err, setErr] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) { setErr("Missing authorization code."); return; }
    connectGmb(Number(state), code)
      .then(() => navigate("/google-business", { replace: true }))
      .catch(() => setErr("Could not complete Google connection."));
  }, [params, navigate]);

  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      {err ? (
        <div>
          <p className="font-semibold text-danger">{err}</p>
          <button onClick={() => navigate("/google-business", { replace: true })} className="mt-3 text-sm font-semibold text-brand hover:underline">Back to Google Business</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-ink-2"><Loader2 className="h-5 w-5 animate-spin" /> Connecting your Google account…</div>
      )}
    </div>
  );
}
