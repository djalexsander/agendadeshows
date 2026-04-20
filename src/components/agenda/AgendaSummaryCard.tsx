import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "primary" | "accent" | "muted";

interface AgendaSummaryCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  accent?: Accent;
  onClick?: () => void;
  ariaLabel?: string;
}

const accentMap: Record<Accent, { iconBg: string; ring: string; glow: string }> = {
  primary: {
    iconBg: "bg-primary/15 text-primary",
    ring: "ring-primary/20",
    glow: "from-primary/10 via-transparent to-transparent",
  },
  accent: {
    iconBg: "bg-accent text-accent-foreground",
    ring: "ring-primary/15",
    glow: "from-primary/8 via-transparent to-transparent",
  },
  muted: {
    iconBg: "bg-secondary text-foreground/80",
    ring: "ring-border",
    glow: "from-foreground/[0.03] via-transparent to-transparent",
  },
};

export function AgendaSummaryCard({
  icon: Icon,
  value,
  label,
  accent = "primary",
  onClick,
  ariaLabel,
}: AgendaSummaryCardProps) {
  const styles = accentMap[accent];
  const isInteractive = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={ariaLabel || label}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card border border-border p-4 sm:p-5 text-left flex flex-col gap-3 transition-all duration-200",
        isInteractive
          ? "cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]"
          : "cursor-default",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", styles.glow)} />
      <div className="relative flex items-center justify-between">
        <div
          className={cn(
            "h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 ring-1",
            styles.iconBg,
            styles.ring,
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className="relative">
        <div className="text-xl sm:text-2xl font-bold leading-tight tracking-tight tabular-nums line-clamp-1">
          {value}
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">
          {label}
        </p>
      </div>
    </button>
  );
}
