import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, XCircle, Clock, DollarSign, Settings, Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminBasePlanPayments } from "@/hooks/useBasePlanPayments";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";

export default function AdminBasePlan() {
  const { toast } = useToast();
  const { payments, loading, approvePayment, rejectPayment, deletePayment, refreshPayments } = useAdminBasePlanPayments();
  const { config, updateConfig, refreshConfig } = useBasePlanConfig();

  const [filter, setFilter] = useState<"all" | "pending_review" | "approved" | "rejected">("all");
  const [actionDialog, setActionDialog] = useState<{ type: "approve" | "reject"; payment: any } | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Config editing
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ name: "", price: "", billing_period: "monthly" });
  const [savingConfig, setSavingConfig] = useState(false);

  const openConfigEdit = () => {
    if (config) {
      setConfigForm({
        name: config.name,
        price: String(config.price),
        billing_period: config.billing_period,
      });
    }
    setEditingConfig(true);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    await updateConfig({
      name: configForm.name,
      price: parseFloat(configForm.price),
      billing_period: configForm.billing_period,
    });
    setSavingConfig(false);
    setEditingConfig(false);
    toast({ title: "Configuração salva", description: "Valor do plano base atualizado." });
  };

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const handleAction = async () => {
    if (!actionDialog) return;
    setProcessing(true);

    if (actionDialog.type === "approve") {
      await approvePayment(actionDialog.payment.id, actionDialog.payment.user_id, actionDialog.payment.amount);
      toast({ title: "Aprovado!", description: "Plano ativado com sucesso." });
    } else {
      await rejectPayment(actionDialog.payment.id, actionDialog.payment.user_id, notes);
      toast({ title: "Rejeitado", description: "Pagamento rejeitado." });
    }

    setProcessing(false);
    setActionDialog(null);
    setNotes("");
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
      toast({ title: "Pagamento excluído", description: "Registro removido permanentemente." });
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]";
      case "rejected": return "bg-destructive/20 text-destructive";
      default: return "bg-yellow-500/20 text-yellow-400";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "approved": return "Aprovado";
      case "rejected": return "Rejeitado";
      default: return "Pendente";
    }
  };

  const pendingCount = payments.filter((p) => p.status === "pending_review").length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4 md:space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Plano Base</h1>
          <p className="text-muted-foreground text-sm">Gerenciar assinaturas e configuração do plano mensal</p>
        </div>
        <Button onClick={openConfigEdit} variant="outline" className="gap-2 rounded-xl">
          <Settings className="h-4 w-4" /> Configurar Plano
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="rounded-2xl bg-card border border-border p-3 md:p-4 space-y-1">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-400" />
          </div>
          <p className="text-xl md:text-2xl font-bold">{pendingCount}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 md:p-4 space-y-1">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-[hsl(140_60%_45%)]/15 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-[hsl(140_60%_55%)]" />
          </div>
          <p className="text-xl md:text-2xl font-bold">{payments.filter((p) => p.status === "approved").length}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Aprovados</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 md:p-4 space-y-1">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-destructive/15 flex items-center justify-center">
            <XCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
          </div>
          <p className="text-xl md:text-2xl font-bold">{payments.filter((p) => p.status === "rejected").length}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Rejeitados</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 md:p-4 space-y-1">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <p className="text-sm md:text-2xl font-bold truncate">R$ {config?.price?.toFixed(2) || "0.00"}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Valor atual</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap overflow-x-auto scrollbar-none">
        {(["all", "pending_review", "approved", "rejected"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todas" : f === "pending_review" ? "Pendentes" : f === "approved" ? "Aprovadas" : "Rejeitadas"}
          </Button>
        ))}
      </div>

      {/* Payment list */}
      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl bg-card border border-border p-3 md:p-4 space-y-2 md:space-y-0 md:flex md:items-center md:gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.profile_name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.profile_email}</p>
              <p className="text-sm text-muted-foreground">
                R$ {p.amount.toFixed(2)} • {format(parseISO(p.submitted_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${statusColor(p.status)}`}>
              {statusLabel(p.status)}
            </span>
            <div className="flex items-center justify-between md:justify-end gap-2">
              {p.status === "pending_review" && (
                <>
                  <Button
                    size="sm"
                    className="gap-1 rounded-xl bg-[hsl(140_60%_45%)] hover:bg-[hsl(140_60%_40%)]"
                    onClick={() => setActionDialog({ type: "approve", payment: p })}
                  >
                    <CheckCircle className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setActionDialog({ type: "reject", payment: p })}
                  >
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                onClick={() => setDeleteTarget(p)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhuma solicitação encontrada</p>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "approve" ? "Aprovar pagamento" : "Rejeitar pagamento"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "approve"
                ? `Confirma a aprovação do pagamento de ${actionDialog?.payment?.profile_name}? O plano será ativado por 30 dias.`
                : `Confirma a rejeição do pagamento de ${actionDialog?.payment?.profile_name}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionDialog?.type === "reject" && (
              <div className="space-y-1.5">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo da rejeição..."
                  className="bg-secondary/50 border-border resize-none"
                  rows={3}
                />
              </div>
            )}
            <Button
              onClick={handleAction}
              disabled={processing}
              className={`w-full h-11 ${actionDialog?.type === "approve" ? "bg-[hsl(140_60%_45%)] hover:bg-[hsl(140_60%_40%)]" : "bg-destructive hover:bg-destructive/90"}`}
            >
              {processing
                ? "Processando..."
                : actionDialog?.type === "approve"
                ? "Confirmar aprovação"
                : "Confirmar rejeição"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Excluir pagamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente o pagamento de R$ {deleteTarget?.amount?.toFixed(2)} de {deleteTarget?.profile_name || "usuário desconhecido"}? Esta ação não pode ser desfeita.
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

      {/* Config Dialog */}
      <Dialog open={editingConfig} onOpenChange={(o) => !o && setEditingConfig(false)}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Configurar Plano Base</DialogTitle>
            <DialogDescription>Edite o nome, valor e período do plano base</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do plano</Label>
              <Input
                value={configForm.name}
                onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                className="h-10 bg-secondary/50 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={configForm.price}
                  onChange={(e) => setConfigForm({ ...configForm, price: e.target.value })}
                  className="h-10 bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select
                  value={configForm.billing_period}
                  onValueChange={(v) => setConfigForm({ ...configForm, billing_period: v })}
                >
                  <SelectTrigger className="h-10 bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full h-11 gap-2 bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {savingConfig ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
