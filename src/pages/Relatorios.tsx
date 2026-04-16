import { useState } from "react";
import { ArrowLeft, FileBarChart, CalendarDays, BarChart3, DollarSign, Users, ChevronRight, TrendingUp, TrendingDown, Wallet, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ModuleGate } from "@/components/modules/ModuleGate";
import { useSupabaseShows, Show } from "@/hooks/useSupabaseShows";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";


const statusLabels: Record<string, { label: string; color: string }> = {
  confirmado: { label: "Confirmado", color: "bg-green-500/15 text-green-500" },
  pendente: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-500" },
  finalizado: { label: "Finalizado", color: "bg-blue-500/15 text-blue-500" },
};

function ShowListDialog({ open, onOpenChange, title, shows }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; shows: Show[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{shows.length} evento(s)</DialogDescription>
        </DialogHeader>
        {shows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento encontrado</p>
        ) : (
          <div className="space-y-2 py-2">
            {shows.map((s) => {
              const st = statusLabels[s.status] || statusLabels.pendente;
              return (
                <div key={s.id} className="rounded-xl bg-secondary/40 border border-border/50 p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{s.evento || s.cidade}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />{s.cidade}/{s.estado}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(s.date + "T12:00:00"), "dd/MM/yyyy")}
                      </span>
                      {s.horario && <span className="text-[10px] text-muted-foreground">{s.horario}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border-0 shrink-0 ${st.color}`}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FinancialDetailDialog({ open, onOpenChange, totals, eventSummaries }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  totals: { entradas: number; saidas: number; saldo: number };
  eventSummaries: { show_id: string; event_name: string; event_date: string | null; entradas: number; saidas: number; saldo: number; count: number }[];
}) {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Detalhamento financeiro
          </DialogTitle>
          <DialogDescription>Resumo geral e por evento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* General totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-500/10 p-3 text-center">
              <TrendingUp className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-green-500">{fmt(totals.entradas)}</p>
              <p className="text-[10px] text-muted-foreground">Entradas</p>
            </div>
            <div className="rounded-xl bg-red-500/10 p-3 text-center">
              <TrendingDown className="h-4 w-4 text-red-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-red-500">{fmt(totals.saidas)}</p>
              <p className="text-[10px] text-muted-foreground">Saídas</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <Wallet className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className={`text-sm font-bold ${totals.saldo >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(totals.saldo)}</p>
              <p className="text-[10px] text-muted-foreground">Saldo</p>
            </div>
          </div>

          {eventSummaries.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por evento</p>
              <div className="space-y-2">
                {eventSummaries.map((ev) => (
                  <div key={ev.show_id} className="rounded-xl bg-secondary/40 border border-border/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{ev.event_name}</span>
                      {ev.event_date && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yy")}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Entradas</span>
                        <p className="font-bold text-green-500">{fmt(ev.entradas)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Saídas</span>
                        <p className="font-bold text-red-500">{fmt(ev.saidas)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Líquido</span>
                        <p className={`font-bold ${ev.saldo >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(ev.saldo)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamDialog({ open, onOpenChange, members }: { open: boolean; onOpenChange: (o: boolean) => void; members: { id: string; name: string; role: string | null; phone: string | null; email: string | null }[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipe
          </DialogTitle>
          <DialogDescription>{members.length} membro(s)</DialogDescription>
        </DialogHeader>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro cadastrado</p>
        ) : (
          <div className="space-y-2 py-2">
            {members.map((m) => (
              <div key={m.id} className="rounded-xl bg-secondary/40 border border-border/50 p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{m.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.role && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.role}</span>}
                    {m.phone && <span className="text-[10px] text-muted-foreground">{m.phone}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type DialogType = "all_events" | "confirmados" | "pendentes" | "finalizados" | "lancamentos" | "saldo" | null;

function RelatoriosContent() {
  const navigate = useNavigate();
  const { shows } = useSupabaseShows();
  const { entries, allEntries, totals, eventSummaries } = useFinancialEntries();
  
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  const statusCounts = shows.reduce<Record<string, number>>((acc, s) => {
    const st = s.status || "pendente";
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const showsByStatus = (status?: string) => {
    if (!status) return shows;
    return shows.filter((s) => s.status === status);
  };

  const cards: { label: string; value: string; icon: any; color: string; dialog: DialogType; subtitle?: string }[] = [
    { label: "Total de eventos", value: String(shows.length), icon: CalendarDays, color: "bg-primary/15 text-primary", dialog: "all_events", subtitle: "Ver todos" },
    { label: "Confirmados", value: String(statusCounts["confirmado"] || 0), icon: BarChart3, color: "bg-green-500/15 text-green-500", dialog: "confirmados", subtitle: "Ver lista" },
    { label: "Pendentes", value: String(statusCounts["pendente"] || 0), icon: BarChart3, color: "bg-yellow-500/15 text-yellow-500", dialog: "pendentes", subtitle: "Ver lista" },
    { label: "Finalizados", value: String(statusCounts["finalizado"] || 0), icon: BarChart3, color: "bg-blue-500/15 text-blue-500", dialog: "finalizados", subtitle: "Ver lista" },
    { label: "Lançamentos financeiros", value: String(allEntries.length), icon: DollarSign, color: "bg-primary/15 text-primary", dialog: "lancamentos", subtitle: "Ver lançamentos" },
    { label: "Saldo financeiro", value: fmt(totals.saldo), icon: DollarSign, color: totals.saldo >= 0 ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500", dialog: "saldo", subtitle: "Ver detalhes" },
    
  ];

  const handleClick = (dialog: DialogType) => {
    if (dialog === "lancamentos") {
      // Navigate to Financeiro page
      const basePath = window.location.pathname.includes("/admin/empresa") ? "/admin/empresa/financeiro" : "/financeiro";
      navigate(basePath);
      return;
    }
    setActiveDialog(dialog);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3 cursor-pointer group hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98]"
              onClick={() => handleClick(c.dialog)}
            >
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
              <p className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity -mt-1">{c.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <ShowListDialog
        open={activeDialog === "all_events"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        title="Todos os eventos"
        shows={showsByStatus()}
      />
      <ShowListDialog
        open={activeDialog === "confirmados"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        title="Eventos confirmados"
        shows={showsByStatus("confirmado")}
      />
      <ShowListDialog
        open={activeDialog === "pendentes"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        title="Eventos pendentes"
        shows={showsByStatus("pendente")}
      />
      <ShowListDialog
        open={activeDialog === "finalizados"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        title="Eventos finalizados"
        shows={showsByStatus("finalizado")}
      />
      <FinancialDetailDialog
        open={activeDialog === "saldo"}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        totals={totals}
        eventSummaries={eventSummaries}
      />
    </>
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
        <p className="text-sm text-muted-foreground">Clique em qualquer indicador para ver os detalhes</p>
        <ModuleGate moduleName="relatorios">
          <RelatoriosContent />
        </ModuleGate>
      </div>
    </div>
  );
}
