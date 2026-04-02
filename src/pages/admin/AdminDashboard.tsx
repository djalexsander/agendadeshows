import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, UserCheck, UserX, Bell, CheckCircle, X, ExternalLink, Clock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";

interface PaymentProof {
  id: string;
  client_user_id: string;
  image_url: string;
  mensagem: string;
  status: string;
  created_at: string;
  client_name?: string;
}

interface PendingUser {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  created_at: string;
  status_plano: string | null;
}

interface AdminNotification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  referencia_user_id: string | null;
  lida: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, ativos: 0, inativos: 0, pagos: 0, pendentes: 0, pendentes_pagamento: 0, pendentes_aprovacao: 0 });
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const [profilesRes, paymentsRes, pendingPaymentsRes, proofsRes, notificationsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, nome, email, telefone, status_plano, created_at"),
      supabase.from("payments").select("status").eq("status", "pago"),
      supabase.from("payments").select("status").eq("status", "pendente"),
      (supabase.from("payment_proofs") as any).select("*").eq("status", "pendente").order("created_at", { ascending: false }),
      (supabase.from("admin_notifications") as any).select("*").eq("lida", false).order("created_at", { ascending: false }),
    ]);

    const profiles = profilesRes.data || [];
    const proofsList = proofsRes.data || [];

    const pending = profiles.filter((p: any) => p.status_plano === "pendente_aprovacao");
    setPendingUsers(pending as PendingUser[]);

    setStats({
      total: profiles.length,
      ativos: profiles.filter((p: any) => p.status_plano === "ativo").length,
      inativos: profiles.filter((p: any) => p.status_plano === "inativo" || p.status_plano === "rejeitado").length,
      pagos: paymentsRes.data?.length || 0,
      pendentes: proofsList.length,
      pendentes_pagamento: pendingPaymentsRes.data?.length || 0,
      pendentes_aprovacao: pending.length,
    });

    const nameMap = new Map(profiles.map((p: any) => [p.user_id, p.nome]));
    setProofs(proofsList.map((p: any) => ({ ...p, client_name: nameMap.get(p.client_user_id) || "—" })));
    setNotifications((notificationsRes.data || []) as AdminNotification[]);
  };

  useEffect(() => {
    load();

    // Realtime notifications
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApproveUser = async (pendingUser: PendingUser) => {
    setLoading(pendingUser.id);
    await supabase.from("profiles").update({
      status_plano: "aguardando_pagamento",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    } as any).eq("user_id", pendingUser.user_id);

    // Mark related notifications as read
    await (supabase.from("admin_notifications") as any)
      .update({ lida: true })
      .eq("referencia_user_id", pendingUser.user_id);

    toast({ title: "Aprovado!", description: `Cadastro de ${pendingUser.nome} aprovado. Aguardando pagamento.` });
    setLoading(null);
    load();
  };

  const handleRejectUser = async (pendingUser: PendingUser) => {
    setLoading(pendingUser.id);
    await supabase.from("profiles").update({
      status_plano: "rejeitado",
    }).eq("user_id", pendingUser.user_id);

    await (supabase.from("admin_notifications") as any)
      .update({ lida: true })
      .eq("referencia_user_id", pendingUser.user_id);

    toast({ title: "Rejeitado", description: `Cadastro de ${pendingUser.nome} rejeitado.` });
    setLoading(null);
    load();
  };

  const handleApprovePayment = async (proof: PaymentProof) => {
    setLoading(proof.id);
    await (supabase.from("payment_proofs") as any).update({ status: "aprovado" }).eq("id", proof.id);
    await supabase.from("profiles").update({ status_plano: "ativo" }).eq("user_id", proof.client_user_id);

    const { data: clientProfile } = await supabase.from("profiles").select("valor_plano").eq("user_id", proof.client_user_id).single();
    const valor = clientProfile?.valor_plano || 0;

    await supabase.from("payments").insert({
      client_user_id: proof.client_user_id,
      valor,
      status: "pago",
      forma_pagamento: "pix",
      data_pagamento: new Date().toISOString().split("T")[0],
    });

    toast({ title: "Aprovado!", description: `Pagamento de ${proof.client_name} aprovado e acesso liberado.` });
    setLoading(null);
    load();
  };

  const handleRejectPayment = async (proof: PaymentProof) => {
    setLoading(proof.id);
    await (supabase.from("payment_proofs") as any).update({ status: "rejeitado" }).eq("id", proof.id);
    await supabase.from("profiles").update({ status_plano: "aguardando_pagamento" }).eq("user_id", proof.client_user_id);
    toast({ title: "Rejeitado", description: `Comprovante de ${proof.client_name} rejeitado.` });
    setLoading(null);
    load();
  };

  const cards = [
    { label: "Total de Clientes", value: stats.total, icon: Users, color: "bg-primary/15 text-primary" },
    { label: "Ativos", value: stats.ativos, icon: UserCheck, color: "bg-[hsl(140_60%_45%)]/15 text-[hsl(140_60%_55%)]" },
    { label: "Aguardando Aprovação", value: stats.pendentes_aprovacao, icon: UserPlus, color: "bg-yellow-500/15 text-yellow-400" },
    { label: "Pagamentos Recebidos", value: stats.pagos, icon: DollarSign, color: "bg-primary/15 text-primary" },
    { label: "Pagamentos Pendentes", value: stats.pendentes_pagamento, icon: Clock, color: "bg-orange-500/15 text-orange-400" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral da plataforma</p>
      </div>

      {/* Notification badge */}
      {notifications.length > 0 && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-yellow-400 shrink-0" />
          <p className="text-sm">
            <strong>{notifications.length}</strong> notificação(ões) não lida(s) — novos cadastros aguardando aprovação.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className={`h-10 w-10 rounded-xl ${card.color} flex items-center justify-center`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending user approvals */}
      {pendingUsers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Novos Cadastros Pendentes ({pendingUsers.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((pu) => (
              <div key={pu.id} className="rounded-xl bg-card border border-yellow-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{pu.nome}</p>
                    <p className="text-xs text-muted-foreground">{pu.email}</p>
                    {pu.telefone && <p className="text-xs text-muted-foreground">{pu.telefone}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastrado em {format(parseISO(pu.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400">
                    Pendente
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproveUser(pu)}
                    disabled={loading === pu.id}
                    className="gap-1 bg-[hsl(140_60%_45%)] hover:bg-[hsl(140_60%_40%)] flex-1"
                  >
                    <CheckCircle className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRejectUser(pu)}
                    disabled={loading === pu.id}
                    className="gap-1 flex-1"
                  >
                    <X className="h-4 w-4" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending payment proofs */}
      {proofs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-semibold">Comprovantes Pendentes ({proofs.length})</h2>
          </div>
          <div className="space-y-3">
            {proofs.map((proof) => (
              <div key={proof.id} className="rounded-xl bg-card border border-orange-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{proof.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Enviado em {format(parseISO(proof.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400">
                    Pendente
                  </span>
                </div>
                {proof.mensagem && (
                  <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                    "{proof.mensagem}"
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <a href={proof.image_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ExternalLink className="h-4 w-4" /> Ver Comprovante
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    onClick={() => handleApprovePayment(proof)}
                    disabled={loading === proof.id}
                    className="gap-1 bg-[hsl(140_60%_45%)] hover:bg-[hsl(140_60%_40%)]"
                  >
                    <CheckCircle className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRejectPayment(proof)}
                    disabled={loading === proof.id}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
