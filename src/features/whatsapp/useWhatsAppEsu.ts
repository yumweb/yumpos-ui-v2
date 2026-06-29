import { useCallback, useEffect, useRef, useState } from "react";
import { startEsu, exchangeEsu } from "./api";

/**
 * Bootstraps WhatsApp Embedded Signup (Meta Facebook JS SDK) for the current
 * location. Ported from the existing app. The SDK loads lazily and `launch()`
 * opens Meta's signup popup; the resulting auth code is exchanged on the backend.
 */
interface EsuConfig {
  appId?: string;
  graphVersion?: string;
  configId?: string;
  solutionId?: string;
  featureType?: string;
  csrf?: string;
}

declare global {
  interface Window {
    FB?: { init: (o: Record<string, unknown>) => void; login: (cb: (r: { authResponse?: { code?: string } }) => void, o: Record<string, unknown>) => void };
    fbAsyncInit?: () => void;
  }
}

export function useWhatsAppEsu() {
  const [config, setConfig] = useState<EsuConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const csrfRef = useRef<string | undefined>(undefined);

  const loadSdk = useCallback(() => {
    if (window.FB) return Promise.resolve("loaded");
    return new Promise<string>((resolve) => {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.onload = () => resolve("loaded");
      script.onerror = () => resolve("error");
      setTimeout(() => resolve("timeout"), 4000);
      document.body.appendChild(script);
    });
  }, []);

  const initSdk = useCallback((c: EsuConfig) => {
    if (!c?.appId || !c?.graphVersion) return;
    window.fbAsyncInit = function () {
      window.FB?.init({ appId: c.appId, autoLogAppEvents: true, xfbml: true, version: c.graphVersion });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const cfg = (await startEsu()) as EsuConfig;
        if (cancelled) return;
        csrfRef.current = cfg?.csrf;
        setConfig(cfg);
        initSdk(cfg);
        loadSdk().then((state) => {
          if (state !== "loaded" && state !== "timeout") setError("Facebook SDK failed to load");
        });
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || "Failed to load signup config");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initSdk, loadSdk]);

  const launch = useCallback(() => {
    if (!config?.configId) return;
    if (!window.FB) { setError("Facebook SDK is not loaded yet. Please try again in a few seconds."); return; }
    const extras = {
      setup: config?.solutionId ? { solutionID: config.solutionId } : {},
      featureType: config?.featureType || "",
      sessionInfoVersion: "3",
    };
    window.FB.login(
      (response) => {
        const code = response?.authResponse?.code ?? null;
        exchangeEsu({ code, sessionEvent: null, csrf: csrfRef.current }).catch(() => {});
      },
      { config_id: String(config.configId), response_type: "code", override_default_response_type: true, extras }
    );
  }, [config]);

  return { config, loading, error, launch };
}
