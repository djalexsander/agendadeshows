import { Users } from "lucide-react";

interface StatusBreakdownProps {
  total: number;
  ativos: number;
  pendentes_aprovacao: number;
  aguardando_pagamento: number;
  inativos: number;
}

export function ClientStatusBreakdown({
  total,
  ativos,
  pendentes_aprovacao,
  aguardando_pagamento,
  inativos,
}: StatusBreakdownProps) {
  const segments = [
    { label: "Ativos", value: ativos, color: "bg-[hsl(140_60%_45%)]", text: "text-[hsl(140_60%_55%)]" },
    { label: "Aguardando aprovação", value: pendentes_aprovacao, color: "bg-yellow-500", text: "text-yellow-400" },
    { label: "Aguardando pagamento", value: aguardando_pagamento, color: "bg-orange-500", text: "text-orange-400" },
    { label: "Inativos / Rejeitados", value: inativos, color: "bg-red-500/70", text: "text-red-400" },
  ];

  const denominator = Math.max(total, 1);

  return (
    <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Users className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold">Status dos clientes</h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground">clientes no total</p>
        </div>

        {/* Stacked bar */}
        <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden flex">
          {segments.map((s) => {
            const pct = (s.value / denominator) * 100;
            if (pct === 0) return null;
            return <div key={s.label} className={s.color} style={{ width: `${pct}%` }} />;
          })}
        </div>

        <div className="space-y-2 pt-1">
          {segments.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full ${s.color} shrink-0`} />
                  <span className="text-muted-foreground truncate">{s.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold tabular-nums">{s.value}</span>
                  <span className="text-muted-foreground/60 tabular-nums w-9 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
