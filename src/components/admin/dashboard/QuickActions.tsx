import { useNavigate } from "react-router-dom";
import { Users, DollarSign, QrCode, CreditCard, Puzzle, Tag, Settings, Zap, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  badges?: Partial<Record<string, number>>;
}

const actions = [
  { to: "/admin/clients", icon: Users, label: "Clientes", color: "text-primary", badgeKey: "clients" },
  { to: "/admin/financial", icon: DollarSign, label: "Financeiro", color: "text-[hsl(140_60%_55%)]", badgeKey: "financial" },
  { to: "/admin/pix", icon: QrCode, label: "Pix", color: "text-emerald-400" },
  { to: "/admin/base-plan", icon: CreditCard, label: "Plano Base", color: "text-primary", badgeKey: "basePlan" },
  { to: "/admin/modules", icon: Puzzle, label: "Módulos", color: "text-orange-400", badgeKey: "modules" },
  { to: "/admin/module-payments", icon: Receipt, label: "Pgto Módulos", color: "text-yellow-400", badgeKey: "modulePayments" },
  { to: "/admin/module-catalog", icon: Tag, label: "Catálogo", color: "text-yellow-400" },
  { to: "/admin/settings", icon: Settings, label: "Config", color: "text-muted-foreground" },
];

export function QuickActions({ badges = {} }: QuickActionsProps) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold">Ações rápidas</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {actions.map((a) => {
          const badge = a.badgeKey ? badges[a.badgeKey] : undefined;
          const hasBadge = typeof badge === "number" && badge > 0;
          return (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[76px]",
                hasBadge && "border-yellow-500/30 bg-yellow-500/5",
              )}
              aria-label={hasBadge ? `${a.label} (${badge} pendência${badge === 1 ? "" : "s"})` : a.label}
            >
              <a.icon className={`h-5 w-5 ${a.color} transition-transform group-hover:scale-110`} />
              <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight">{a.label}</span>
              {hasBadge && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-500 text-[10px] font-bold text-background flex items-center justify-center tabular-nums shadow-sm shadow-yellow-500/40">
                  {badge! > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
