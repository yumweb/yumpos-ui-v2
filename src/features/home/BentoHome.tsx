import { Link } from "react-router-dom";
import { startOfDay, endOfDay, startOfMonth, getDate } from "date-fns";
import {
  ShoppingCart,
  CalendarDays,
  Wallet,
  TrendingUp,
  Users,
  Magnet,
  Ticket,
  IdCard,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { isApiConfigured } from "@/lib/apiClient";
import { useDashboardSales } from "./api";

function Tile({ accent, className, children }: { accent?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-[156px] flex-col gap-2.5 overflow-hidden rounded-lg p-5 transition-transform duration-150 hover:-translate-y-0.5",
        accent ? "text-brand-fg" : "border border-border bg-surface shadow-sm2 hover:shadow-soft",
        className
      )}
      style={accent ? { background: "linear-gradient(150deg, var(--brand), var(--brand-600))" } : undefined}
    >
      {children}
    </div>
  );
}

function TileHead({ icon: Icon, accent, children }: { icon: React.ElementType; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2 text-[13px] font-semibold", accent ? "opacity-90" : "text-ink-2")}>
      <Icon className={cn("h-4 w-4", !accent && "text-brand")} />
      <span>{children}</span>
    </div>
  );
}

function Metric({ loading, value, className }: { loading: boolean; value: React.ReactNode; className?: string }) {
  if (loading) return <div className={cn("h-9 w-28 animate-pulse rounded bg-surface-2", className)} />;
  return <div className={className}>{value ?? "—"}</div>;
}

const QUICK = [
  { label: "New Sale", to: "/sales", icon: ShoppingCart },
  { label: "Appointments", to: "/appointments", icon: CalendarDays },
  { label: "Leads", to: "/leads", icon: Magnet },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Family Cards", to: "/family-cards", icon: IdCard },
  { label: "Tickets", to: "/tickets", icon: Ticket },
];

export function BentoHome() {
  const now = new Date();
  const today = useDashboardSales(startOfDay(now).toISOString(), endOfDay(now).toISOString());
  const month = useDashboardSales(startOfMonth(now).toISOString(), endOfDay(now).toISOString());

  const configured = isApiConfigured();
  const tLoad = configured && today.isLoading;
  const mLoad = configured && month.isLoading;
  const t = today.data;
  const m = month.data;

  const monthPay = m != null ? Number(m.total_payment) : NaN;
  const projected = Number.isFinite(monthPay) ? (monthPay / Math.max(getDate(now), 1)) * 30 : undefined;

  const walkins = (d?: typeof t) =>
    d ? `${d.total_sales ?? 0} walk-ins · M ${d.male_total ?? 0} / F ${d.female_total ?? 0}` : "Walk-ins · gender split";

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-[25px] font-bold tracking-tight">SnapShot</h1>
      </header>

      {!configured && (
        <div className="mb-5 rounded-md border border-border bg-[var(--warn-soft)] px-4 py-3 text-[13px] text-ink-2">
          Live data not connected. Set <code className="font-semibold">VITE_API_URL</code> and{" "}
          <code className="font-semibold">VITE_API_KEY</code> in <code>.env</code>.
        </div>
      )}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        {/* Sale Today (accent) */}
        <Tile accent>
          <TileHead icon={Wallet} accent>Sale today</TileHead>
          <Metric loading={tLoad} value={t ? formatINR(Number(t.total_payment) || 0) : undefined} className="tnum text-[34px] font-extrabold leading-none tracking-tight" />
          <div className="text-[12.5px] opacity-80">{walkins(t)}</div>
        </Tile>

        {/* Sale This Month */}
        <Tile>
          <TileHead icon={TrendingUp}>Sale this month</TileHead>
          <Metric loading={mLoad} value={m ? formatINR(Number(m.total_payment) || 0) : undefined} className="tnum text-[34px] font-extrabold leading-none tracking-tight" />
          <div className="text-[12.5px] text-ink-3">{walkins(m)}</div>
        </Tile>

        {/* Appointments Today */}
        <Tile>
          <TileHead icon={CalendarDays}>Appointments today</TileHead>
          <div className="flex flex-1 items-center gap-8">
            <div>
              <Metric loading={tLoad} value={t ? t.scheduled_appointments ?? 0 : undefined} className="tnum text-[30px] font-extrabold" />
              <div className="text-xs text-ink-3">Scheduled</div>
            </div>
            <div>
              <Metric loading={tLoad} value={t ? t.completed_appointments ?? 0 : undefined} className="tnum text-[30px] font-extrabold" />
              <div className="text-xs text-ink-3">Completed</div>
            </div>
          </div>
        </Tile>

        {/* Projected Sales */}
        <Tile>
          <TileHead icon={TrendingUp}>Projected sales</TileHead>
          <Metric loading={mLoad} value={projected != null ? formatINR(projected) : undefined} className="tnum text-[34px] font-extrabold leading-none tracking-tight" />
          <div className="text-[12.5px] text-ink-3">Month-end estimate</div>
        </Tile>
      </div>

      {/* Quick actions */}
      <div className="mt-[18px] rounded-lg border border-border bg-surface p-5 shadow-sm2">
        <TileHead icon={ShoppingCart}>Quick actions</TileHead>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
          {QUICK.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
