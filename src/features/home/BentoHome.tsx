import { Link } from "react-router-dom";
import { startOfDay, endOfDay, startOfMonth, getDate } from "date-fns";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ShoppingCart,
  CalendarDays,
  Wallet,
  TrendingUp,
  BadgeCheck,
  Users,
  Magnet,
  Ticket,
  IdCard,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import { isApiConfigured } from "@/lib/apiClient";
import { useDashboardSales, useSummaryGraph } from "./api";

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-sm2",
        "transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-soft",
        className
      )}
    >
      {children}
    </div>
  );
}

function TileHead({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
      <Icon className="h-4 w-4 text-brand" />
      <span>{children}</span>
    </div>
  );
}

/** Value, a skeleton while loading, or "—" when there's no data. No fake numbers. */
function Metric({
  loading,
  value,
  className,
}: {
  loading: boolean;
  value: React.ReactNode;
  className?: string;
}) {
  if (loading) return <div className={cn("h-8 w-24 animate-pulse rounded bg-surface-2", className)} />;
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
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const today = useDashboardSales(todayStart, todayEnd);
  const month = useDashboardSales(monthStart, todayEnd);
  const graph = useSummaryGraph(monthStart, todayEnd);

  const configured = isApiConfigured();
  const tLoad = configured && today.isLoading;
  const mLoad = configured && month.isLoading;
  const t = today.data;
  const m = month.data;

  const projected =
    m && typeof m.total_payment === "number"
      ? (m.total_payment / Math.max(getDate(now), 1)) * 30
      : undefined;

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-[25px] font-bold tracking-tight">SnapShot</h1>
        <p className="mt-1 text-sm text-ink-2">Today &amp; month-to-date · Indiranagar</p>
      </header>

      {!configured && (
        <div className="mb-5 rounded-md border border-warn/30 bg-[var(--warn-soft)] px-4 py-3 text-[13px] text-ink-2">
          Live data not connected. Set <code className="font-semibold">VITE_API_URL</code> and{" "}
          <code className="font-semibold">VITE_API_KEY</code> in <code>.env</code> to load the
          dashboard from the existing API.
        </div>
      )}

      <div className="grid auto-rows-[174px] grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {/* hero — today sales (real: total_payment, total_sales, M/F) + summary graph */}
        <div
          className="row-span-2 flex flex-col gap-2 overflow-hidden rounded-lg p-5 text-brand-fg sm:col-span-2"
          style={{ background: "linear-gradient(150deg, var(--brand), var(--brand-600))" }}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold opacity-90">
            <Wallet className="h-4 w-4" /> Today · sales
          </div>
          <Metric
            loading={tLoad}
            value={t ? formatINR(Number(t.total_payment) || 0) : undefined}
            className="tnum text-[42px] font-extrabold leading-none tracking-tight"
          />
          <div className="text-[12.5px] opacity-80">
            {t ? (
              <>
                {t.total_sales ?? 0} walk-ins · M {t.male_total ?? 0} / F {t.female_total ?? 0}
              </>
            ) : (
              "Walk-ins · gender split"
            )}
          </div>
          <div className="flex-1" />
          <div className="h-[60px]">
            {graph.data && graph.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graph.data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="homeGraph" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-fg)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--brand-fg)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--brand-fg)"
                    strokeWidth={2}
                    fill="url(#homeGraph)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center text-[11px] opacity-60">
                Sales summary graph
              </div>
            )}
          </div>
        </div>

        {/* appointments (real: scheduled / completed) */}
        <Tile>
          <TileHead icon={CalendarDays}>Appointments today</TileHead>
          <div className="flex flex-1 items-center gap-6">
            <div>
              <Metric loading={tLoad} value={t ? t.scheduled_appointments ?? 0 : undefined} className="tnum text-[28px] font-extrabold" />
              <div className="text-xs text-ink-3">Scheduled</div>
            </div>
            <div>
              <Metric loading={tLoad} value={t ? t.completed_appointments ?? 0 : undefined} className="tnum text-[28px] font-extrabold" />
              <div className="text-xs text-ink-3">Completed</div>
            </div>
          </div>
        </Tile>

        {/* this month (real monthly total_payment / walk-ins) */}
        <Tile>
          <TileHead icon={TrendingUp}>This month</TileHead>
          <Metric loading={mLoad} value={m ? formatINR(Number(m.total_payment) || 0) : undefined} className="tnum text-[26px] font-extrabold" />
          <div className="text-[12.5px] text-ink-3">
            {m ? `${m.total_sales ?? 0} walk-ins · M ${m.male_total ?? 0} / F ${m.female_total ?? 0}` : "Walk-ins · gender split"}
          </div>
        </Tile>

        {/* projected (real, computed from monthly) */}
        <Tile>
          <TileHead icon={TrendingUp}>Projected (est.)</TileHead>
          <Metric loading={mLoad} value={projected != null ? formatINR(projected) : undefined} className="tnum text-[26px] font-extrabold" />
          <div className="text-[12.5px] text-ink-3">Month-end estimate</div>
        </Tile>

        {/* subscription validity (real: accountValidity) */}
        <Tile>
          <TileHead icon={BadgeCheck}>Subscription</TileHead>
          <Metric
            loading={tLoad}
            value={
              t?.accountValidity
                ? new Date(t.accountValidity).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : undefined
            }
            className="text-[20px] font-bold"
          />
          <div className="text-[12.5px] text-ink-3">Valid until</div>
        </Tile>

        {/* quick actions — links to real modules only */}
        <Tile className="sm:col-span-2 xl:col-span-4">
          <TileHead icon={ShoppingCart}>Quick actions</TileHead>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
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
        </Tile>
      </div>
    </div>
  );
}
