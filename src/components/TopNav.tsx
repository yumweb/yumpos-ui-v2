import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, MapPin, Plus, Bell, LogOut, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { tenant } from "@/design/tenants";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/primitives";
import { NAV, type NavGroup } from "@/app/nav";
import { logout, getLocation } from "@/lib/auth";

function GroupMenu({
  group,
  active,
  open,
  onToggle,
  onClose,
}: {
  group: NavGroup;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
          active ? "bg-brand-100 text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
        )}
      >
        {group.label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[200px] overflow-hidden rounded-md border border-border bg-surface p-1.5 shadow-soft">
          {group.items!.map((it) => (
            <NavLink
              key={it.path}
              to={it.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "block rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-100 text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )
              }
            >
              {it.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [acctOpen, setAcctOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  const location = getLocation();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) setOpenId(null);
      if (acctRef.current && !acctRef.current.contains(target)) setAcctOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const groupActive = (g: NavGroup) =>
    g.items ? g.items.some((it) => pathname.startsWith(it.path)) : pathname === g.path;

  return (
    <header className="flex h-[66px] items-center gap-3 border-b border-border bg-surface px-6">
      <NavLink to="/home" className="flex items-center">
        <img
          src={theme === "light" ? tenant.logo.onLight : tenant.logo.onDark}
          alt={tenant.name}
          className="h-10 w-auto"
        />
      </NavLink>

      <nav ref={navRef} className="ml-2 flex items-center gap-1">
        {NAV.map((g) =>
          g.path ? (
            <NavLink
              key={g.id}
              to={g.path}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-brand-100 text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )
              }
            >
              {g.label}
            </NavLink>
          ) : (
            <GroupMenu
              key={g.id}
              group={g}
              active={groupActive(g)}
              open={openId === g.id}
              onToggle={() => setOpenId((id) => (id === g.id ? null : g.id))}
              onClose={() => setOpenId(null)}
            />
          )
        )}
      </nav>

      <div className="flex-1" />

      <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold xl:inline-flex">
        <MapPin className="h-4 w-4" />
        {location?.locationName ?? location?.name ?? "Location"}
        <ChevronDown className="h-4 w-4 text-ink-3" />
      </div>

      <Button variant="primary" className="whitespace-nowrap" onClick={() => navigate("/sales")}>
        <Plus className="h-4 w-4" /> New sale
      </Button>

      <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-ink-2">
        <Bell className="h-[18px] w-[18px]" />
      </div>

      <div ref={acctRef} className="relative">
        <button
          onClick={() => setAcctOpen((o) => !o)}
          aria-label="Account menu"
          className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand"
        >
          <User className="h-[18px] w-[18px]" />
        </button>
        {acctOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[180px] rounded-md border border-border bg-surface p-1.5 shadow-soft">
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
