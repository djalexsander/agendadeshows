import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "danger" | "info";
  hint?: string;
  onClick?: () => void;
}

const accentMap = {
  primary: {
    iconBg: "bg-primary/15 text-primary",
    ring: "ring-primary/20",
    glow: "from-primary/8 via-transparent to-transparent",
  },
  success: {
    iconBg: "bg-[hsl(140_60%_45%)]/15 text-[hsl(140_60%_55%)]",
    ring: "ring-[hsl(140_60%_45%)]/20",
    glow: "from-[hsl(140_60%_45%)]/8 via-transparent to-transparent",
  },
  warning: {
    iconBg: "bg-yellow-500/15 text-yellow-400",
    ring: "ring-yellow-500/20",
    glow: "from-yellow-500/8 via-transparent to-transparent",
  },
  danger: {
    iconBg: "bg-red-500/15 text-red-400",
    ring: "ring-red-500/20",
    glow: "from-red-500/8 via-transparent to-transparent",
  },
  info: {
    iconBg: "bg-orange-500/15 text-orange-400",
    ring: "ring-orange-500/20",
    glow: "from-orange-500/8 via-transparent to-transparent",
  },
};

export function MetricCard({ label, value, icon: Icon, accent = "primary", hint, onClick }: MetricCardProps) {
  const styles = accentMap[accent];
  const interactive = typeof onClick === "function";

  const content = (
    <>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60", styles.glow)} />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "h-10 w-10 md:h-11 md:w-11 rounded-xl flex items-center justify-center ring-1",
              styles.iconBg,
              styles.ring,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="text-[11px] md:text-xs text-muted-foreground leading-tight font-medium uppercase tracking-wide">
            {label}
          </p>
          {hint && <p className="text-[10px] md:text-xs text-muted-foreground/70 pt-1">{hint}</p>}
        </div>
      </div>
    </>
  );

  const baseClass = cn(
    "group relative overflow-hidden rounded-2xl bg-card border border-border p-4 md:p-5 transition-all",
    interactive
      ? "text-left w-full cursor-pointer hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
      : "hover:border-border/80 hover:shadow-lg hover:-translate-y-0.5",
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
