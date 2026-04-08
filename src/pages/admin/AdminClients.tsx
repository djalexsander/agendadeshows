import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Search, Trash2, Globe, Shield, Info } from "lucide-react";
import { getEffectivePlanStatus, type EffectivePlanStatus } from "@/lib/planStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface ClientProfile {
  id: string;
  user_id: string;
  nome: string;
  nome_artistico: string | null;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  status_plano: string | null;
  valor_plano: number | null;
  vencimento: string | null;
  current_period_end: string | null;
  observacoes: string | null;
  origem_cadastro: string | null;
  plan_type: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  is_paid: boolean | null;
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // Handle ISO timestamps like "2026-05-08T16:15:00+00:00"
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return "";
}

export default function AdminClients() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    nome: "", telefone: "", cidade: "", estado: "",
    status_plano: "ativo", valor_plano: "", vencimento: "", observacoes: "",
  });

  const fetchClients = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setClients(data as ClientProfile[]);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openEdit = (c: ClientProfile) => {
    setEditingClient(c);
    const isTrialOrLifetime = c.plan_type === "free_trial_7_days" || (c.plan_type === "lifetime" && c.is_paid);
    setForm({
      nome: c.nome,
      telefone: c.telefone || "", cidade: c.cidade || "", estado: c.estado || "",
      status_plano: c.status_plano || "ativo",
      valor_plano: isTrialOrLifetime ? "" : String(c.valor_plano || ""),
      vencimento: toDateInputValue(c.current_period_end) || toDateInputValue(c.vencimento), observacoes: c.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    setLoading(true);

    await supabase.from("profiles").update({
      nome: form.nome, telefone: form.telefone,
      cidade: form.cidade, estado: form.estado, status_plano: form.status_plano,
      valor_plano: form.valor_plano ? parseFloat(form.valor_plano) : 0,
      vencimento: form.vencimento || null,
      current_period_end: form.vencimento ? new Date(form.vencimento + "T23:59:59Z").toISOString() : null,
      observacoes: form.observacoes,
    } as any).eq("id", editingClient!.id);

    // Update max_users on the company
    await (supabase.from("companies") as any).update({
      max_users: parseInt(form.max_users) || 1,
    }).eq("owner_user_id", editingClient!.user_id);

    toast({ title: "Sucesso", description: "Cliente atualizado." });

    setLoading(false);
    setDialogOpen(false);
    setEditingClient(null);
    fetchClients();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    const response = await supabase.functions.invoke("delete-user", {
      body: { user_id: deleteTarget.user_id },
    });
    if (response.error || response.data?.error) {
      toast({ title: "Erro", description: response.data?.error || response.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Cliente excluído." });
      fetchClients();
    }
    setLoading(false);
    setDeleteTarget(null);
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.nome_artistico || "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const getDisplayStatus = (c: ClientProfile) => {
    if (c.plan_type === "free_trial_7_days") {
      const trialEnd = c.trial_ends_at ? new Date(c.trial_ends_at) : null;
      const isExpired = trialEnd && new Date() > trialEnd;
      if (isExpired) return { label: "Trial Expirado", color: "bg-destructive/20 text-destructive" };
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      return { label: `Trial (${daysLeft}d)`, color: "bg-blue-500/20 text-blue-400" };
    }
    if (c.plan_type === "lifetime" && c.is_paid) {
      return { label: "Vitalício", color: "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]" };
    }
    switch (c.status_plano) {
      case "aguardando_pagamento": return { label: "Aguard. Pagamento", color: "bg-orange-500/20 text-orange-400" };
      case "pagamento_em_analise": return { label: "Pagto. em Análise", color: "bg-blue-500/20 text-blue-400" };
      case "pending_plan_choice": return { label: "Escolhendo Plano", color: "bg-yellow-500/20 text-yellow-400" };
      case "ativo": return { label: "Ativo", color: "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]" };
      case "rejeitado":
      case "inativo": return { label: c.status_plano === "rejeitado" ? "Rejeitado" : "Inativo", color: "bg-destructive/20 text-destructive" };
      default: return { label: c.status_plano || "ativo", color: "bg-yellow-500/20 text-yellow-400" };
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clients.length} cadastrado(s)</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, artístico ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-secondary/50 border-border rounded-xl"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{c.nome}</p>
                {c.origem_cadastro === "publico_link" ? (
                  <span title="Cadastro pelo link"><Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" /></span>
                ) : (
                  <span title="Criado pelo admin"><Shield className="h-3.5 w-3.5 text-primary shrink-0" /></span>
                )}
              </div>
              {c.nome_artistico && (
                <p className="text-sm text-primary truncate">{c.nome_artistico}</p>
              )}
              <p className="text-sm text-muted-foreground">{c.email}</p>
              {c.plan_type === "free_trial_7_days" && c.trial_ends_at && (
                <p className="text-xs text-muted-foreground">
                  Expira: {new Date(c.trial_ends_at).toLocaleDateString("pt-BR")}
                </p>
              )}
              {c.plan_type === "lifetime" && c.is_paid && (
                <p className="text-xs text-muted-foreground">Plano vitalício</p>
              )}
              {c.plan_type !== "free_trial_7_days" && !(c.plan_type === "lifetime" && c.is_paid) && c.valor_plano != null && c.valor_plano > 0 && (
                <p className="text-xs text-muted-foreground">R$ {c.valor_plano.toFixed(2)}</p>
              )}
            </div>
            {(() => { const s = getDisplayStatus(c); return (
              <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${s.color}`}>
                {s.label}
              </span>
            ); })()}
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Atualize os dados do cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-10 bg-secondary/50 border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger className="h-10 bg-secondary/50 border-border">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {ESTADOS_BR.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Computed real status */}
            {editingClient && (() => {
              const realStatus = getEffectivePlanStatus(editingClient);
              const statusLabels: Record<EffectivePlanStatus, string> = {
                trial: "Em teste",
                trial_expired: "Trial expirado",
                pending_payment: "Aguardando pagamento",
                pending_review: "Em análise",
                active: "Ativo",
                expired: "Vencido",
                rejected: "Recusado",
                blocked: "Bloqueado",
                pending_plan_choice: "Escolhendo plano",
              };
              const statusColors: Record<EffectivePlanStatus, string> = {
                trial: "bg-blue-500/20 text-blue-400",
                trial_expired: "bg-destructive/20 text-destructive",
                pending_payment: "bg-orange-500/20 text-orange-400",
                pending_review: "bg-blue-500/20 text-blue-400",
                active: "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]",
                expired: "bg-destructive/20 text-destructive",
                rejected: "bg-destructive/20 text-destructive",
                blocked: "bg-muted text-muted-foreground",
                pending_plan_choice: "bg-yellow-500/20 text-yellow-400",
              };
              return (
                <div className="flex items-center gap-2 rounded-xl bg-secondary/30 border border-border/50 px-3 py-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Status real:</span>
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-lg ${statusColors[realStatus]}`}>
                    {statusLabels[realStatus]}
                  </span>
                </div>
              );
            })()}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status Admin</Label>
                <Select value={form.status_plano} onValueChange={(v) => setForm({ ...form, status_plano: v })}>
                  <SelectTrigger className="h-10 bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="aguardando_pagamento">Aguard. Pagamento</SelectItem>
                    <SelectItem value="pagamento_em_analise">Pagto. em Análise</SelectItem>
                    <SelectItem value="pendente_pagamento">Pendente Pagamento</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_plano} onChange={(e) => setForm({ ...form, valor_plano: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de usuários</Label>
                <Input type="number" min="1" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} className="h-10 bg-secondary/50 border-border" placeholder="1" />
                <p className="text-[10px] text-muted-foreground">Máximo de membros na empresa</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong> ({deleteTarget?.email})?
              Todos os dados (shows, pagamentos) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive hover:bg-destructive/90">
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
