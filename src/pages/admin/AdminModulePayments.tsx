import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Filter, Puzzle, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAdminModulePayments, type AdminModulePayment } from "@/hooks/useAdminModulePayments";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const MODULE_LABELS: Record<string, string> = {
  financeiro: "Financeiro",
  equipe: "Equipe",
  relatorios: "Relatórios",
  export_png: "Exportação PNG",
  gps: "Rotas / GPS",
};

type StatusFilter = "all" | "pending_review" | "approved" | "rejected";

export default function AdminModulePayments() {
  const { payments, loading, approvePayment, rejectPayment, deletePayment } = useAdminModulePayments();
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("pending_review");
  const [actionTarget, setActionTarget] = useState<AdminModulePayment | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminModulePayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const handleConfirm = async () => {
    if (!actionTarget) return;
    setProcessing(true);
    if (actionType === "approve") {
      await approvePayment(actionTarget);
      toast({ title: "Pagamento aprovado", description: `Módulo "${MODULE_LABELS[actionTarget.module_name] ?? actionTarget.module_name}" ativado para ${actionTarget.user_nome}.` });
    } else {
      await rejectPayment(actionTarget, reason);
      toast({ title: "Pagamento rejeitado", description: `Pagamento de "${MODULE_LABELS[actionTarget.module_name] ?? actionTarget.module_name}" rejeitado.` });
    }
    setProcessing(false);
    setActionTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deletePayment(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result?.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pagamento excluído", description: `Pagamento de "${MODULE_LABELS[deleteTarget.module_name] ?? deleteTarget.module_name}" removido.` });
    }
  };

  const statusBadge = (p: AdminModulePayment) => {
    const status = p.status;
    const isAsaas = (p as any).gateway_provider === "asaas";
    if (status === "approved") return (
      <div className="flex items-center gap-1">
        <Badge className="bg-green-600/15 text-green-500 border-green-600/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>
        {isAsaas && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px]">Asaas</Badge>}
      </div>
    );
    if (status === "rejected") return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
    return (
      <div className="flex items-center gap-1">
        <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
        {isAsaas && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px]">Asaas</Badge>}
      </div>
    );
  };

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "pending_review", label: "Pendentes" },
    { key: "approved", label: "Aprovados" },
    { key: "rejected", label: "Rejeitados" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pagamentos de Módulos</h1>
          <p className="text-xs text-muted-foreground">Analise comprovantes e aprove ou rejeite pagamentos de add-ons.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {filterButtons.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="rounded-xl text-xs h-8"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1.5 opacity-60">({payments.filter((p) => p.status === f.key).length})</span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Nenhum pagamento encontrado.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="hidden md:table-cell">Comprovante</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{p.user_nome}</p>
                    <p className="text-[11px] text-muted-foreground">{p.user_email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{MODULE_LABELS[p.module_name] ?? p.module_name}</TableCell>
                  <TableCell className="text-sm font-semibold">R$ {p.amount.toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(p)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {format(new Date(p.submitted_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.receipt_url ? (
                      <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Ver
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === "pending_review" && (
                        <>
                          <Button size="sm" variant="default" className="rounded-xl text-xs h-7 px-3" onClick={() => { setActionTarget(p); setActionType("approve"); setReason(""); }}>
                            <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">Aprovar</span>
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 px-3 text-destructive border-destructive/30" onClick={() => { setActionTarget(p); setActionType("reject"); setReason(""); }}>
                            <XCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">Rejeitar</span>
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Aprovar pagamento" : "Rejeitar pagamento"}</DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `O módulo "${MODULE_LABELS[actionTarget?.module_name ?? ""] ?? actionTarget?.module_name}" será ativado para ${actionTarget?.user_nome}.`
                : `O pagamento de "${MODULE_LABELS[actionTarget?.module_name ?? ""] ?? actionTarget?.module_name}" de ${actionTarget?.user_nome} será rejeitado.`}
            </DialogDescription>
          </DialogHeader>
          {actionType === "reject" && (
            <Textarea placeholder="Motivo da rejeição (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[80px]" />
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setActionTarget(null)} disabled={processing}>Cancelar</Button>
            <Button variant={actionType === "approve" ? "default" : "destructive"} onClick={handleConfirm} disabled={processing} className="gap-1.5">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {actionType === "approve" ? "Confirmar aprovação" : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir pagamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente o pagamento de R$ {deleteTarget?.amount.toFixed(2)} ({MODULE_LABELS[deleteTarget?.module_name ?? ""] ?? deleteTarget?.module_name}) de {deleteTarget?.user_nome || "usuário desconhecido"}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}