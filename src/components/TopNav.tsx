import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarDays,
  Users,
  BarChart3,
  ChevronDown,
  Search,
  MapPin,
  Plus,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { tenant } from "@/design/tenants";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/primitives";

const TABS = [
  { to: "/home", label: "Home", icon: LayoutDashboard },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export function TopNav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex h-[66px] items-center gap-4 border-b border-border bg-surface px-6">
      <NavLink to="/home" className="flex items-center">
        <img src={tenant.logo} alt={tenant.name} className="h-8 w-auto" />
      </NavLink>

      <nav className="ml-2 flex items-center gap-1">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand-100 text-brand"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )
            }
          >
            <Icon className="h-[17px] w-[17px]" />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-ink-3 hover:bg-surface-2">
          More <ChevronDown className="h-4 w-4" />
        </button>
      </nav>

      <div className="flex-1" />

      <button className="inline-flex min-w-[230px] items-center gap-2 rounded-full border border-border bg-surface-2 px-3.5 py-2 text-[13.5px] text-ink-3">
        <Search className="h-4 w-4" />
        <span>Search anything…</span>
        <kbd className="ml-auto rounded border border-border bg-surface px-1.5 text-[11px]">
          ⌘K
        </kbd>
      </button>

      <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold">
        <MapPin className="h-4 w-4" /> Indiranagar
        <ChevronDown className="h-4 w-4 text-ink-3" />
      </div>

      <Button variant="primary" className="whitespace-nowrap">
        <Plus className="h-4 w-4" /> New sale
      </Button>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-ink-2"
      >
        {theme === "light" ? (
          <Moon className="h-[18px] w-[18px]" />
        ) : (
          <Sun className="h-[18px] w-[18px]" />
        )}
      </button>

      <div className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-ink-2">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface bg-danger" />
      </div>

      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-bold text-brand">
        SJ
      </div>
    </header>
  );
}
