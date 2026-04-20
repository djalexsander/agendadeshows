import { useNavigate } from "react-router-dom";
import { Users, DollarSign, QrCode, CreditCard, Puzzle, Tag, Settings, Zap } from "lucide-react";

const actions = [
  { to: "/admin/clients", icon: Users, label: "Clientes", color: "text-primary" },
  { to: "/admin/financial", icon: DollarSign, label: "Financeiro", color: "text-[hsl(140_60%_55%)]" },
  { to: "/admin/pix", icon: QrCode, label: "Pix", color: "text-emerald-400" },
  { to: "/admin/base-plan", icon: CreditCard, label: "Plano Base", color: "text-primary" },
  { to: "/admin/modules", icon: Puzzle, label: "Módulos", color: "text-orange-400" },
  { to: "/admin/module-catalog", icon: Tag, label: "Catálogo", color: "text-yellow-400" },
  { to: "/admin/settings", icon: Settings, label: "Config", color: "text-muted-foreground" },
];

export function QuickActions() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold">Ações rápidas</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {actions.map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border transition-all"
          >
            <a.icon className={`h-5 w-5 ${a.color} transition-transform group-hover:scale-110`} />
            <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
