import { ArrowLeft, FileBarChart, CalendarDays, BarChart3, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ModuleGate } from "@/components/modules/ModuleGate";
import { useSupabaseShows } from "@/hooks/useSupabaseShows";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useTeamMembers } from "@/hooks/useTeamMembers";

function RelatoriosContent() {
  const { shows } = useSupabaseShows();
  const { entries, totals } = useFinancialEntries();
  const { members } = useTeamMembers();

  const statusCounts = shows.reduce<Record<string, number>>((acc, s) => {
    const st = s.status || "pendente";
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { label: "Total de eventos", value: String(shows.length), icon: CalendarDays, color: "bg-primary/15 text-primary" },
    { label: "Confirmados", value: String(statusCounts["confirmado"] || 0), icon: BarChart3, color: "bg-green-500/15 text-green-500" },
    { label: "Pendentes", value: String(statusCounts["pendente"] || 0), icon: BarChart3, color: "bg-yellow-500/15 text-yellow-500" },
    { label: "Finalizados", value: String(statusCounts["finalizado"] || 0), icon: BarChart3, color: "bg-blue-500/15 text-blue-500" },
    { label: "Lançamentos financeiros", value: String(entries.length), icon: DollarSign, color: "bg-primary/15 text-primary" },
    { label: "Saldo financeiro", value: fmt(totals.saldo), icon: DollarSign, color: totals.saldo >= 0 ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500" },
    { label: "Membros da equipe", value: String(members.length), icon: Users, color: "bg-primary/15 text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Relatorios() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Relatórios</h1>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10 space-y-4">
        <p className="text-sm text-muted-foreground">Visão geral do seu sistema</p>
        <ModuleGate moduleName="relatorios">
          <RelatoriosContent />
        </ModuleGate>
      </div>
    </div>
  );
}
