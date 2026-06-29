import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/** Shown once per login. The flag is cleared at login (auth.setSession), so it
 *  reappears on the next sign-in but not on refresh/navigation. */
const SEEN_KEY = "yumpos_announcement_seen";

export function AnnouncementModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) {
      setOpen(true);
      localStorage.setItem(SEEN_KEY, "1");
    }
  }, []);

  if (!open) return null;
  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onMouseDown={() => setOpen(false)}>
      <div onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-[560px] rounded-xl border border-border bg-surface p-8 text-center shadow-soft">
        <button onClick={() => setOpen(false)} aria-label="Close" className="absolute right-4 top-4 text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>

        <p className="text-xs font-bold uppercase tracking-wider text-ok">New • Premium</p>
        <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight">Announcing the launch of WhatsApp &amp; Google My Business Profile Manager</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-2">
          New premium features to manage your WhatsApp messaging and your Google Business reviews, posts and insights, right inside YumPOS.
        </p>

        <div className="mt-6 flex justify-center gap-10">
          <button onClick={() => go("/whatsapp")} className="group flex flex-col items-center gap-2 transition-transform hover:-translate-y-1">
            <WhatsAppLogo /><span className="text-xs font-semibold">WhatsApp</span>
          </button>
          <button onClick={() => go("/google-business")} className="group flex flex-col items-center gap-2 transition-transform hover:-translate-y-1">
            <GoogleLogo /><span className="text-xs font-semibold">Google My Business</span>
          </button>
        </div>

        <p className="mt-6 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-2">
          Get in touch with <span className="font-bold text-ink">YumPOS Support</span> at{" "}
          <a href="https://wa.me/919100906273" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap font-bold text-brand hover:underline">+91 91009 06273</a>{" "}
          to get your WhatsApp and Google My Business integrated for your location.
        </p>

        <div className="mt-6"><Button variant="primary" onClick={() => setOpen(false)}>Got it</Button></div>
      </div>
    </div>
  );
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="#25D366" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
