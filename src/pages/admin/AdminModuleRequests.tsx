import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Filter, Puzzle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAdminModuleRequests, type AdminModuleRequest } from "@/hooks/useAdminModuleRequests";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { MODULE_LABELS } from "@/lib/modules";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminModuleRequests() {
  const { requests, loading, approveRequest, rejectRequest, deleteRequest } = useAdminModuleRequests();
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [actionTarget, setActionTarget] = useState<AdminModuleRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminModuleRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const openAction = (req: AdminModuleRequest, type: "approve" | "reject") => {
    setActionTarget(req);
    setActionType(type);
    setNotes("");
  };

  const handleConfirm = async () => {
    if (!actionTarget) return;
    setProcessing(true);

    let result;
    if (actionType === "approve") {
      result = await approveRequest(actionTarget.id, actionTarget.user_id, actionTarget.module_name, notes);
    } else {
      result = await rejectRequest(actionTarget.id, notes);
    }

    setProcessing(false);
    setActionTarget(null);

    if (result.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    } else {
      toast({
        title: actionType === "approve" ? "Módulo aprovado" : "Solicitação rejeitada",
        description: actionType === "approve"
          ? `"${MODULE_LABELS[actionTarget.module_name] ?? actionTarget.module_name}" ativado para ${actionTarget.user_nome || "usuário"}.`
          : `Solicitação de "${MODULE_LABELS[actionTarget.module_name] ?? actionTarget.module_name}" rejeitada.`,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteRequest(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Solicitação excluída", description: `Solicitação de "${MODULE_LABELS[deleteTarget.module_name] ?? deleteTarget.module_name}" removida.` });
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600/15 text-green-500 border-green-600/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
    return <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "pending", label: "Pendentes" },
    { key: "approved", label: "Aprovadas" },
    { key: "rejected", label: "Rejeitadas" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Solicitações de Módulos</h1>
          <p className="text-xs text-muted-foreground">Analise e aprove ou rejeite solicitações de add-ons dos clientes.</p>
        </div>
      </div>

      {/* Filters */}
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
              <span className="ml-1.5 opacity-60">
                ({requests.filter((r) => f.key === "all" || r.status === f.key).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{req.user_nome || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{req.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {MODULE_LABELS[req.module_name] ?? req.module_name}
                  </TableCell>
                  <TableCell>{statusBadge(req.status)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {format(new Date(req.requested_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {req.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="rounded-xl text-xs h-7 px-3"
                            onClick={() => openAction(req, "approve")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline ml-1">Aprovar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs h-7 px-3 text-destructive border-destructive/30"
                            onClick={() => openAction(req, "reject")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline ml-1">Rejeitar</span>
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(req)}
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

      {/* Confirm Action Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprovar módulo" : "Rejeitar solicitação"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `O módulo "${MODULE_LABELS[actionTarget?.module_name ?? ""] ?? actionTarget?.module_name}" será ativado para ${actionTarget?.user_nome || "o usuário"}.`
                : `A solicitação de "${MODULE_LABELS[actionTarget?.module_name ?? ""] ?? actionTarget?.module_name}" de ${actionTarget?.user_nome || "o usuário"} será rejeitada.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Observação (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setActionTarget(null)} disabled={processing}>
              Cancelar
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleConfirm}
              disabled={processing}
              className="gap-1.5"
            >
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
            <DialogTitle>Excluir solicitação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente a solicitação de "{MODULE_LABELS[deleteTarget?.module_name ?? ""] ?? deleteTarget?.module_name}" de {deleteTarget?.user_nome || "usuário desconhecido"}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
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