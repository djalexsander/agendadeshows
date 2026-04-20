import { TrendingUp, DollarSign, Wallet } from "lucide-react";

interface RevenueOverviewProps {
  totalReceived: number;
  pendingPaymentsCount: number;
  monthRevenue: number;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function RevenueOverview({ totalReceived, pendingPaymentsCount, monthRevenue }: RevenueOverviewProps) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-[hsl(140_60%_45%)]/15 flex items-center justify-center">
          <Wallet className="h-3.5 w-3.5 text-[hsl(140_60%_55%)]" />
        </div>
        <h2 className="text-sm font-semibold">Pagamentos & Assinaturas</h2>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Receita do mês
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-[hsl(140_60%_55%)]" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{formatBRL(monthRevenue)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-[hsl(140_60%_55%)]" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Pagos</p>
            </div>
            <p className="text-lg font-bold tabular-nums">{totalReceived}</p>
          </div>
          <div className="rounded-xl bg-secondary/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-orange-400" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Pendentes</p>
            </div>
            <p className="text-lg font-bold tabular-nums">{pendingPaymentsCount}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/70 pt-1">
          Receita = pagamentos confirmados no mês corrente.
        </p>
      </div>
    </div>
  );
}
