import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, UserPlus, Receipt, Puzzle, FileCheck } from "lucide-react";

interface AttentionPanelProps {
  pendingUsers: number;
  pendingProofs: number;
  pendingBasePlanPayments: number;
  pendingModulePayments: number;
  pendingModuleRequests: number;
}

export function AttentionPanel({
  pendingUsers,
  pendingProofs,
  pendingBasePlanPayments,
  pendingModulePayments,
  pendingModuleRequests,
}: AttentionPanelProps) {
  const navigate = useNavigate();

  const items = [
    {
      label: "Cadastros aguardando aprovação",
      count: pendingUsers,
      icon: UserPlus,
      color: "text-yellow-400 bg-yellow-500/15",
      route: "/admin/clients",
    },
    {
      label: "Comprovantes para revisar",
      count: pendingProofs,
      icon: FileCheck,
      color: "text-orange-400 bg-orange-500/15",
      route: "/admin/financial",
    },
    {
      label: "Pagamentos de Plano Base pendentes",
      count: pendingBasePlanPayments,
      icon: Receipt,
      color: "text-primary bg-primary/15",
      route: "/admin/base-plan",
    },
    {
      label: "Pagamentos de Módulos pendentes",
      count: pendingModulePayments,
      icon: Receipt,
      color: "text-primary bg-primary/15",
      route: "/admin/module-payments",
    },
    {
      label: "Solicitações de módulos pendentes",
      count: pendingModuleRequests,
      icon: Puzzle,
      color: "text-orange-400 bg-orange-500/15",
      route: "/admin/modules",
    },
  ];

  const totalPending = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-yellow-500/15 flex items-center justify-center">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
          </div>
          <h2 className="text-sm font-semibold">Itens que exigem atenção</h2>
        </div>
        {totalPending > 0 && (
          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-yellow-500/15 text-yellow-400">
            {totalPending} {totalPending === 1 ? "item" : "itens"}
          </span>
        )}
      </div>

      {totalPending === 0 ? (
        <div className="p-8 text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-[hsl(140_60%_45%)]/15 flex items-center justify-center">
            <FileCheck className="h-6 w-6 text-[hsl(140_60%_55%)]" />
          </div>
          <p className="text-sm font-medium">Tudo em dia</p>
          <p className="text-xs text-muted-foreground">Nenhuma pendência administrativa no momento.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items
            .filter((i) => i.count > 0)
            .map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                </div>
                <span className="text-lg font-bold tabular-nums">{item.count}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
