import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Music, Pencil, Trash2, CheckCircle, CalendarDays, CreditCard, User, FileText, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialEntry } from "@/hooks/useFinancialEntries";

interface Props {
  entry: FinancialEntry | null;
  onClose: () => void;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CONFIRMED = ["pago", "recebido", "confirmado"];

export function FinancialEntryViewModal({ entry, onClose, onEdit, onDelete, onMarkPaid }: Props) {
  if (!entry) return null;

  const isPending = entry.status === "pendente";
  const isPaid = CONFIRMED.includes(entry.status);

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
        <DialogHeader className="pb-0">
          <DialogTitle className="sr-only">Detalhes do lançamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event name - hero */}
          {entry.event_name ? (
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base text-primary truncate">{entry.event_name}</p>
                {entry.event_date && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.event_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Music className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground italic">Sem evento vinculado</p>
            </div>
          )}

          {/* Type + Title */}
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${entry.type === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`}>
              {entry.type === "entrada" ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{entry.title}</p>
              <p className={`text-xs ${entry.type === "entrada" ? "text-green-500" : "text-red-500"}`}>
                {entry.type === "entrada" ? "Entrada" : "Saída"}
              </p>
            </div>
          </div>

          {/* Value */}
          <div className={`rounded-xl p-4 text-center ${entry.type === "entrada" ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <p className={`text-2xl font-bold ${entry.type === "entrada" ? "text-green-500" : "text-red-500"}`}>
              {entry.type === "entrada" ? "+" : "-"}{fmt(Number(entry.amount))}
            </p>
          </div>

          {/* Status + Date row */}
          <div className="flex items-center justify-between">
            <Badge className={`text-xs px-2.5 py-1 ${isPaid ? "bg-green-500/15 text-green-500 border-green-500/30" : isPending ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"}`}>
              {isPaid ? "Pago" : isPending ? "Pendente" : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
            </Badge>
            {entry.data_lancamento && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(entry.data_lancamento + "T12:00:00"), "dd/MM/yyyy")}
              </span>
            )}
          </div>

          <Separator />

          {/* Details grid */}
          <div className="space-y-2.5">
            {entry.categoria && (
              <div className="flex items-center gap-2.5 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Categoria:</span>
                <span className="font-medium">{entry.categoria}</span>
              </div>
            )}
            {entry.forma_pagamento && (
              <div className="flex items-center gap-2.5 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Pagamento:</span>
                <span className="font-medium">{entry.forma_pagamento}</span>
              </div>
            )}
            {entry.pessoa && (
              <div className="flex items-center gap-2.5 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Pessoa:</span>
                <span className="font-medium">{entry.pessoa}</span>
              </div>
            )}
            {entry.data_vencimento && (
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">{format(new Date(entry.data_vencimento + "T12:00:00"), "dd/MM/yyyy")}</span>
              </div>
            )}
            {entry.data_pagamento && (
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Data pgto:</span>
                <span className="font-medium">{format(new Date(entry.data_pagamento + "T12:00:00"), "dd/MM/yyyy")}</span>
              </div>
            )}
            {entry.parcelas > 1 && (
              <div className="flex items-center gap-2.5 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Parcela:</span>
                <span className="font-medium">{entry.parcela_atual}/{entry.parcelas}</span>
              </div>
            )}
            {entry.notes && (
              <div className="rounded-lg bg-secondary/50 p-3 mt-2">
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{entry.notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isPending && (
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => { onMarkPaid(entry.id); onClose(); }}
              >
                <CheckCircle className="h-4 w-4" />
                Marcar como pago
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => { onEdit(entry); onClose(); }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                onClick={() => { onDelete(entry.id); onClose(); }}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
