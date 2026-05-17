import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Search, Trash2, Globe, Shield, Info, KeyRound } from "lucide-react";
import { AdminAccessControlDialog } from "@/components/admin/AdminAccessControl";
import { getEffectivePlanStatus, type EffectivePlanStatus, EFFECTIVE_PLAN_STATUS_LABELS } from "@/lib/planStatus";
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
  grace_ends_at: string | null;
  is_paid: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch { return "—"; }
}

function formatOrigem(origem: string | null | undefined): string {
  if (origem === "publico_link") return "Link público (auto-cadastro)";
  if (origem === "admin_manual") return "Criado pelo admin";
  if (origem === "google_oauth") return "Login com Google";
  if (origem?.endsWith("_oauth")) return `Login com ${origem.replace("_oauth", "")}`;
  return origem || "—";
}

function formatPlanType(plan: string | null | undefined): string {
  if (plan === "free_trial_7_days") return "Trial 7 dias";
  if (plan === "lifetime") return "Vitalício";
  if (plan === "monthly") return "Mensal";
  if (plan === "yearly") return "Anual";
  return plan || "—";
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
  const [manualPlanUserIds, setManualPlanUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [accessControlTarget, setAccessControlTarget] = useState<ClientProfile | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    nome: "", telefone: "", cidade: "", estado: "",
    status_plano: "ativo", valor_plano: "", vencimento: "", observacoes: "",
    max_users_override: "",
  });

  const fetchClients = async () => {
    const [profilesRes, overridesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      (supabase.from("manual_plan_overrides") as any)
        .select("user_id")
        .eq("is_active", true),
    ]);
    if (profilesRes.data) setClients(profilesRes.data as ClientProfile[]);
    setManualPlanUserIds(new Set(((overridesRes.data ?? []) as Array<{ user_id: string }>).map((o) => o.user_id)));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openEdit = async (c: ClientProfile) => {
    setEditingClient(c);
    const isTrialOrLifetime = c.plan_type === "free_trial_7_days" || (c.plan_type === "lifetime" && c.is_paid);

    const { data: companyData } = await supabase
      .from("companies")
      .select("max_users")
      .eq("owner_user_id", c.user_id)
      .limit(1)
      .single();

    const overrideVal = (companyData as any)?.max_users;

    setForm({
      nome: c.nome,
      telefone: c.telefone || "", cidade: c.cidade || "", estado: c.estado || "",
      status_plano: c.status_plano || "ativo",
      valor_plano: isTrialOrLifetime ? "" : String(c.valor_plano || ""),
      vencimento: toDateInputValue(c.current_period_end) || toDateInputValue(c.vencimento), observacoes: c.observacoes || "",
      max_users_override: overrideVal && overrideVal > 1 ? String(overrideVal) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    setLoading(true);

    // If switching to trial, set trial dates
    const isSwitchingToTrial = form.status_plano === "trial";
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const graceEnd = new Date(trialEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

    const updatePayload: any = {
      nome: form.nome, telefone: form.telefone,
      cidade: form.cidade, estado: form.estado,
      status_plano: isSwitchingToTrial ? "ativo" : form.status_plano,
      valor_plano: form.valor_plano ? parseFloat(form.valor_plano) : 0,
      vencimento: form.vencimento || null,
      current_period_end: form.vencimento ? new Date(form.vencimento + "T23:59:59Z").toISOString() : null,
      observacoes: form.observacoes,
    };

    if (isSwitchingToTrial) {
      updatePayload.plan_type = "free_trial_7_days";
      updatePayload.trial_started_at = now.toISOString();
      updatePayload.trial_ends_at = trialEnd.toISOString();
      updatePayload.grace_ends_at = graceEnd.toISOString();
      updatePayload.is_paid = false;
    }

    await supabase.from("profiles").update(updatePayload).eq("id", editingClient!.id);


    // Save company max_users override
    const overrideNum = form.max_users_override ? parseInt(form.max_users_override) : 1;
    await (supabase.from("companies") as any).update({
      max_users: overrideNum || 1,
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
    // Highest priority: manual plan override granted by admin via "Controle de Acesso"
    if (manualPlanUserIds.has(c.user_id)) {
      return { label: "Liberado (Manual)", color: "bg-purple-500/20 text-purple-400" };
    }
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-xs md:text-sm">{clients.length} cadastrado(s)</p>
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

      <div className="space-y-2 md:space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border border-border p-3 md:p-4 space-y-2 md:space-y-0 md:flex md:items-start md:gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate text-sm md:text-base">{c.nome || "(sem nome)"}</p>
                {c.origem_cadastro === "publico_link" ? (
                  <span title="Cadastro pelo link público" className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                    <Globe className="h-3 w-3" /> Link público
                  </span>
                ) : c.origem_cadastro?.endsWith("_oauth") ? (
                  <span title={`Cadastro via ${c.origem_cadastro.replace("_oauth", "")}`} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                    <Globe className="h-3 w-3" /> {c.origem_cadastro.replace("_oauth", "")}
                  </span>
                ) : (
                  <span title="Criado pelo admin" className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
              {c.nome_artistico && (
                <p className="text-xs md:text-sm text-primary truncate">{c.nome_artistico}</p>
              )}
              <p className="text-xs md:text-sm text-muted-foreground truncate">{c.email}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground pt-1">
                <p>📅 Criado: <span className="text-foreground/80">{formatDateTime(c.created_at)}</span></p>
                <p>📦 Plano: <span className="text-foreground/80">{formatPlanType(c.plan_type)}</span></p>
                {c.telefone && <p>📞 {c.telefone}</p>}
                {(c.cidade || c.estado) && <p>📍 {[c.cidade, c.estado].filter(Boolean).join(" / ")}</p>}
                {c.plan_type === "free_trial_7_days" && c.trial_ends_at && (
                  <p>⏳ Trial expira: <span className="text-foreground/80">{formatDate(c.trial_ends_at)}</span></p>
                )}
                {c.current_period_end && (
                  <p>🔁 Vencimento: <span className="text-foreground/80">{formatDate(c.current_period_end)}</span></p>
                )}
                {c.valor_plano != null && c.valor_plano > 0 && (
                  <p>💰 Valor: <span className="text-foreground/80">R$ {Number(c.valor_plano).toFixed(2)}</span></p>
                )}
                <p>💳 Pago: <span className={c.is_paid ? "text-green-400" : "text-orange-400"}>{c.is_paid ? "Sim" : "Não"}</span></p>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-2 md:pt-1">
              {(() => { const s = getDisplayStatus(c); return (
                <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${s.color}`}>
                  {s.label}
                </span>
              ); })()}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Ver todos os detalhes" onClick={() => setDetailsTarget(c)}>
                  <Info className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-purple-400 hover:text-purple-300" title="Controle de acesso" onClick={() => setAccessControlTarget(c)}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
                    {EFFECTIVE_PLAN_STATUS_LABELS[realStatus]}
                  </span>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status Admin</Label>
                <Select value={form.status_plano} onValueChange={(v) => setForm({ ...form, status_plano: v })}>
                  <SelectTrigger className="h-10 bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="aguardando_pagamento">Aguard. Pagamento</SelectItem>
                      <SelectItem value="pagamento_em_analise">Pagto. em Análise</SelectItem>
                      <SelectItem value="pendente_pagamento">Pendente Pagamento</SelectItem>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Limite usuários (VIP)</Label>
                <Input type="number" min="1" placeholder="Padrão do módulo" value={form.max_users_override} onChange={(e) => setForm({ ...form, max_users_override: e.target.value })} className="h-10 bg-secondary/50 border-border" />
                <p className="text-[10px] text-muted-foreground">Deixe vazio para usar o padrão do módulo</p>
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

      <AdminAccessControlDialog
        open={!!accessControlTarget}
        onOpenChange={(o) => {
          if (!o) {
            setAccessControlTarget(null);
            // Refresh so manual plan/module changes are reflected on the card badge
            fetchClients();
          }
        }}
        targetUserId={accessControlTarget?.user_id ?? ""}
        targetUserName={accessControlTarget?.nome ?? ""}
      />

      <Dialog open={!!detailsTarget} onOpenChange={(o) => !o && setDetailsTarget(null)}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>Todas as informações registradas</DialogDescription>
          </DialogHeader>
          {detailsTarget && (
            <div className="space-y-2 text-sm">
              {[
                ["Nome", detailsTarget.nome || "—"],
                ["Nome artístico", detailsTarget.nome_artistico || "—"],
                ["E-mail", detailsTarget.email],
                ["Telefone", detailsTarget.telefone || "—"],
                ["Cidade / UF", [detailsTarget.cidade, detailsTarget.estado].filter(Boolean).join(" / ") || "—"],
                ["Origem do cadastro", formatOrigem(detailsTarget.origem_cadastro)],
                ["Data de criação", formatDateTime(detailsTarget.created_at)],
                ["Última atualização", formatDateTime(detailsTarget.updated_at)],
                ["Tipo de plano", formatPlanType(detailsTarget.plan_type)],
                ["Status (admin)", detailsTarget.status_plano || "—"],
                ["Pago", detailsTarget.is_paid ? "Sim ✅" : "Não ❌"],
                ["Valor do plano", detailsTarget.valor_plano != null ? `R$ ${Number(detailsTarget.valor_plano).toFixed(2)}` : "—"],
                ["Trial iniciado em", formatDateTime(detailsTarget.trial_started_at)],
                ["Trial expira em", formatDateTime(detailsTarget.trial_ends_at)],
                ["Carência expira em", formatDateTime(detailsTarget.grace_ends_at)],
                ["Vencimento atual", formatDateTime(detailsTarget.current_period_end)],
                ["Observações", detailsTarget.observacoes || "—"],
                ["User ID", detailsTarget.user_id],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-border/40 py-1.5">
                  <span className="text-muted-foreground shrink-0">{k}</span>
                  <span className="text-right break-all">{v}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
