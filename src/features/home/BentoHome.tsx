import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  CalendarDays,
  Star,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  LayoutDashboard,
  BarChart3,
  Repeat,
  UserPlus,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/primitives";

const heroBars = [54, 40, 66, 58, 80, 100, 72];

const appointments = [
  ["11:00", "Rhea Anand", "Hydra Facial · Anjali"],
  ["11:30", "Vikram Kapoor", "Haircut · Ravi"],
  ["12:15", "Meera Shah", "Global Colour · Priya"],
  ["1:00", "Sana Iqbal", "Gel Manicure · Zoya"],
  ["1:30", "Dev Gupta", "Beard Trim · Ravi"],
  ["2:00", "Nisha Khanna", "Cleanup · Anjali"],
];

const topServices = [
  ["Hydra Facial", "22", "₹52,800"],
  ["Global Hair Colour", "14", "₹44,800"],
  ["Keratin Treatment", "6", "₹33,000"],
  ["Gel Manicure", "28", "₹25,200"],
];

const activity: [React.ElementType, string, string][] = [
  [Receipt, "Sale #10428 · Rhea A. · ₹3,409", "2m"],
  [UserPlus, "New client added · Kabir M.", "12m"],
  [Star, '★★★★★ review · "Best facial in town…"', "18m"],
  [CalendarDays, "Appointment booked · Sana · 3:00 PM", "24m"],
  [Gift, "Gift card redeemed · ₹1,000", "41m"],
];

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

function TileHead({ icon: Icon, children, extra }: { icon: React.ElementType; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
      <Icon className="h-4 w-4 text-brand" />
      <span>{children}</span>
      {extra && <span className="ml-auto">{extra}</span>}
    </div>
  );
}

function Donut() {
  return (
    <div
      className="relative h-[78px] w-[78px] shrink-0 rounded-full"
      style={{ background: "conic-gradient(var(--brand) 0 62%, var(--accent) 62% 82%, var(--border) 82% 100%)" }}
    >
      <div className="absolute inset-[12px] rounded-full bg-surface" />
    </div>
  );
}

export function BentoHome() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-[25px] font-bold tracking-tight">Good morning, Sameer</h1>
        <p className="mt-1 text-sm text-ink-2">Tuesday, 24 June · Indiranagar · 4 stylists on shift</p>
      </header>

      <div className="grid auto-rows-[174px] grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {/* hero — net sales (2x2, accent) */}
        <div
          className="row-span-2 flex flex-col gap-2.5 overflow-hidden rounded-lg p-5 text-brand-fg sm:col-span-2"
          style={{ background: "linear-gradient(150deg, var(--brand), var(--brand-600))" }}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold opacity-90">
            <Wallet className="h-4 w-4" /> Net sales · today
            <span className="ml-auto">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
                <TrendingUp className="h-3.5 w-3.5" /> 9.2%
              </span>
            </span>
          </div>
          <div className="tnum text-[42px] font-extrabold leading-none tracking-tight">₹1,18,400</div>
          <div className="text-[12.5px] opacity-80">186 bills · avg ₹636 · vs ₹1.08L last Tuesday</div>
          <div className="flex-1" />
          <div className="flex h-[46px] items-end gap-1.5">
            {heroBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${h}%`, background: i === 5 ? "var(--brand-fg)" : "color-mix(in srgb, var(--brand-fg) 30%, transparent)" }}
              />
            ))}
          </div>
        </div>

        {/* next up (1x2) */}
        <Tile className="row-span-2">
          <TileHead icon={CalendarDays} extra={<Badge>Calendar</Badge>}>Next up</TileHead>
          <div className="-mx-1 flex-1 overflow-auto px-1">
            {appointments.map(([time, who, svc]) => (
              <div key={time + who} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
                <span className="tnum w-[50px] text-[13px] font-bold text-ink-2">{time}</span>
                <span className="flex-1 text-[13.5px] font-semibold">
                  {who}
                  <br />
                  <span className="text-xs text-ink-3">{svc}</span>
                </span>
              </div>
            ))}
          </div>
        </Tile>

        {/* reputation */}
        <Tile>
          <TileHead icon={Star}>Reputation</TileHead>
          <div className="text-[30px] font-extrabold tracking-tight">
            4.7<span className="text-accent">★</span>
          </div>
          <div className="text-[12.5px] text-ink-3">318 reviews · 3 to reply</div>
        </Tile>

        {/* quick sale CTA */}
        <Link
          to="/sales"
          className="flex flex-col justify-between overflow-hidden rounded-lg p-5 text-brand-fg transition-transform duration-150 hover:-translate-y-0.5"
          style={{ background: "linear-gradient(150deg, var(--brand), var(--brand-600))" }}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold opacity-90">
            <ShoppingCart className="h-4 w-4" /> Quick sale
          </div>
          <div>
            <div className="text-[21px] font-bold">Start checkout</div>
            <div className="text-[12.5px] opacity-80">Walk-in · new ticket</div>
          </div>
        </Link>

        {/* row 3 — four 1x1 */}
        <Tile>
          <TileHead icon={Receipt}>Bills today</TileHead>
          <div className="tnum text-[30px] font-extrabold">186</div>
          <div className="flex items-center gap-1 text-[12.5px] text-ok">
            <TrendingUp className="h-4 w-4" /> 5% vs last Tue
          </div>
        </Tile>
        <Tile>
          <TileHead icon={Package}>Low stock</TileHead>
          <div className="tnum text-[30px] font-extrabold">6</div>
          <div className="text-[12.5px] text-ink-3">items below par · reorder</div>
        </Tile>
        <Tile>
          <TileHead icon={Users}>Footfall</TileHead>
          <div className="tnum text-[30px] font-extrabold">142</div>
          <div className="flex items-center gap-1 text-[12.5px] text-ok">
            <TrendingUp className="h-4 w-4" /> 11%
          </div>
        </Tile>
        <Tile>
          <TileHead icon={LayoutDashboard}>Revenue mix</TileHead>
          <div className="flex flex-1 items-center gap-3">
            <Donut />
            <div className="flex flex-col gap-1.5 text-[11.5px]">
              <span><Badge tone="brand">●</Badge> Services 62%</span>
              <span><Badge tone="warn">●</Badge> Packages 20%</span>
              <span><Badge>●</Badge> Retail 18%</span>
            </div>
          </div>
        </Tile>

        {/* row 4 — two 2x1 */}
        <Tile className="sm:col-span-2">
          <TileHead icon={BarChart3} extra={<Badge>Report</Badge>}>Top services today</TileHead>
          <div className="-mx-1 flex-1 overflow-auto px-1">
            {topServices.map(([name, qty, rev]) => (
              <div key={name} className="flex items-center gap-2 border-b border-border py-2 text-[13px] last:border-0">
                <span className="flex-1 font-semibold">{name}</span>
                <span className="tnum w-9 text-right text-ink-3">{qty}</span>
                <span className="tnum w-[72px] text-right font-semibold">{rev}</span>
              </div>
            ))}
          </div>
        </Tile>
        <Tile className="sm:col-span-2">
          <TileHead icon={Repeat}>Recent activity</TileHead>
          <div className="-mx-1 flex-1 overflow-auto px-1">
            {activity.map(([Icon, text, time], i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-border py-2 text-[13px] last:border-0">
                <Icon className="h-4 w-4 text-ink-3" />
                <span className="flex-1">{text}</span>
                <span className="text-xs text-ink-3">{time}</span>
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </div>
  );
}
