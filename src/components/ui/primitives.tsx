import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/* Button ------------------------------------------------------------------ */
type ButtonVariant = "default" | "primary" | "accent" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-md " +
  "transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";

const btnVariants: Record<ButtonVariant, string> = {
  default: "bg-surface text-ink border border-border hover:bg-surface-2",
  primary: "bg-brand text-brand-fg hover:bg-brand-600",
  accent: "bg-accent text-ink hover:opacity-90",
  ghost: "bg-transparent text-ink-2 hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
};

const btnSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(btnBase, btnVariants[variant], btnSizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

/* Card -------------------------------------------------------------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg shadow-sm2",
        className
      )}
      {...props}
    />
  );
}

/* Badge ------------------------------------------------------------------- */
export type BadgeTone = "default" | "brand" | "ok" | "warn" | "danger";
const badgeTones: Record<BadgeTone, string> = {
  default: "bg-surface-2 text-ink-2",
  brand: "bg-brand-100 text-brand",
  ok: "bg-[var(--ok-soft)] text-ok",
  warn: "bg-[var(--warn-soft)] text-warn",
  danger: "bg-[var(--danger-soft)] text-danger",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}
