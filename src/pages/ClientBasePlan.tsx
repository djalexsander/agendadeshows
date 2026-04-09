import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Crown, CheckCircle, Clock, XCircle, CalendarX, Send, Upload, ArrowLeft, FileText, LogOut, ShieldCheck, Copy, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useClientBasePlan } from "@/hooks/useClientBasePlan";
import { useSubscriptionSummary } from "@/hooks/useSubscriptionSummary";
import { getEffectivePlanStatus } from "@/lib/planStatus";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AsaasPixData {
  paymentId: string;
  asaasPaymentId: string;
  payload: string;
  qrCodeImage: string;
  expirationDate: string;
  amount: number;
  reused: boolean;
}

export default function ClientBasePlan() {
  const { user, profile, signOut } = useAuth();
  const { payments, hasPending, createPayment } = useClientBasePlan();
  const summary = useSubscriptionSummary();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showManualForm, setShowManualForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // Asaas state
  const [asaasLoading, setAsaasLoading] = useState(false);
  const [asaasPixData, setAsaasPixData] = useState<AsaasPixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [showCpfInput, setShowCpfInput] = useState(false);

  const status = getEffectivePlanStatus(profile);
  const price = summary.basePrice;
  const totalPrice = summary.total;
  const planName = summary.basePlanName;
  const hasModules = summary.modules.length > 0;

  const handleAsaasPayment = async () => {
    if (!user) return;
    
    // If no CPF/CNPJ provided yet, show the input
    if (!cpfCnpj.trim()) {
      setShowCpfInput(true);
      return;
    }

    setAsaasLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-asaas-base-plan-payment", {
        body: { cpfCnpj: cpfCnpj.replace(/\D/g, "") },
      });

      if (error) {
        console.error("Asaas error:", error);
        toast({ title: "Erro", description: "Não foi possível gerar o pagamento PIX.", variant: "destructive" });
        setAsaasLoading(false);
        return;
      }

      setAsaasPixData(data as AsaasPixData);
      setShowCpfInput(false);
      if (data?.reused) {
        toast({ title: "PIX existente", description: "Você já tem um PIX pendente. Use o código abaixo." });
      } else {
        toast({ title: "PIX gerado!", description: "Escaneie o QR Code ou copie o código para pagar." });
      }
    } catch (err) {
      console.error("Asaas payment error:", err);
      toast({ title: "Erro", description: "Falha ao gerar pagamento.", variant: "destructive" });
    }
    setAsaasLoading(false);
  };

  const handleCopyPayload = async () => {
    if (!asaasPixData?.payload) return;
    try {
      await navigator.clipboard.writeText(asaasPixData.payload);
      setCopied(true);
      toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  // Manual payment fallback
  const handleManualSubmit = async () => {
    if (!user) return;
    setUploading(true);

    let receiptUrl: string | undefined;

    if (file) {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("comprovantes").upload(filePath, file);
      if (uploadError) {
        toast({ title: "Erro", description: "Falha ao enviar arquivo.", variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("comprovantes").getPublicUrl(filePath);
      receiptUrl = urlData.publicUrl;
    }

    const moduleNames = summary.modules.map((m) => m.display_name);
    const fullNotes = [
      notes,
      moduleNames.length > 0 ? `[Módulos incluídos: ${moduleNames.join(", ")}]` : "",
    ].filter(Boolean).join(" | ");

    const result = await createPayment({
      receiptUrl,
      notes: fullNotes || undefined,
      amount: totalPrice,
    });

    if (result?.error) {
      toast({ title: "Erro", description: "Não foi possível enviar.", variant: "destructive" });
    } else {
      toast({ title: "Enviado!", description: "Seu pagamento foi enviado para análise." });
      supabase.functions.invoke("send-push", {
        body: {
          title: "💳 Pagamento do plano base",
          body: `${profile?.nome || "Um cliente"} enviou pagamento para análise.`,
          url: "/admin/base-plan",
          target_role: "admin",
        },
      }).catch(() => {});
      setShowManualForm(false);
      setFile(null);
      setNotes("");
    }
    setUploading(false);
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aprovado</Badge>;
      case "rejected":
        return <Badge variant="destructive">Recusado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Em análise</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Meu Plano</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua assinatura</p>
        </div>

        {/* Plan info card */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{planName}</h2>
              <p className="text-sm text-muted-foreground">Assinatura mensal</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Organize, controle e profissionalize seus shows com facilidade.
          </p>

          {/* "Você está contratando" */}
          <div className="rounded-xl bg-secondary/30 border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Você está contratando</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                {planName}
              </div>
              {summary.modules.map((m) => (
                <div key={m.module_name} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  {m.display_name}
                </div>
              ))}
            </div>
            {hasModules && (
              <p className="text-xs text-muted-foreground italic pt-1">
                Você escolheu apenas os módulos que precisa, sem pagar por funcionalidades desnecessárias.
              </p>
            )}
          </div>

          {/* Valores */}
          <div className="rounded-xl bg-secondary/30 border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhamento</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plano Base</span>
              <span className="font-medium text-foreground">R$ {price.toFixed(2)}</span>
            </div>
            {hasModules && (
              <div className="space-y-2">
                {summary.modules.map((m) => (
                  <div key={m.module_name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{m.display_name}</span>
                    <span className="font-medium text-foreground">R$ {m.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <Separator className="my-1" />
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano selecionado</span>
                <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                Aproximadamente R$ {(totalPrice / 30).toFixed(2)} por dia
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Seu plano inclui todas as funcionalidades selecionadas e será ativado após a confirmação do pagamento.
          </p>

          {/* Status badges */}
          {status === "active" && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-400">Plano ativo</p>
                {profile?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Vence em {format(new Date(profile.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "trial" && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-blue-400">Período de teste</p>
                {profile?.trial_ends_at && (
                  <p className="text-sm text-muted-foreground">
                    Seu teste termina em {format(new Date(profile.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}. Garanta seu acesso antes do vencimento.
                  </p>
                )}
              </div>
            </div>
          )}

          {(status === "expired" || status === "trial_expired") && (
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 flex items-center gap-3">
              <CalendarX className="h-5 w-5 text-orange-400 shrink-0" />
              <div>
                <p className="font-semibold text-orange-400">
                  {status === "trial_expired" ? "Período de teste expirado" : "Plano vencido"}
                </p>
                <p className="text-sm text-muted-foreground">Renove para continuar usando o app</p>
              </div>
            </div>
          )}

          {status === "pending_review" && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
              <div>
                <p className="font-semibold text-yellow-400">Pagamento em análise</p>
                <p className="text-sm text-muted-foreground">Aguardando confirmação do pagamento</p>
              </div>
            </div>
          )}

          {status === "rejected" && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-red-400">Pagamento recusado</p>
                <p className="text-sm text-muted-foreground">Envie um novo comprovante</p>
              </div>
            </div>
          )}

          {/* CTA buttons */}
          {!hasPending && status !== "pending_review" && !asaasPixData && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Você pode cancelar a qualquer momento.
              </p>

              {/* CPF/CNPJ input */}
              {showCpfInput && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CPF ou CNPJ (obrigatório)</Label>
                  <Input
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              )}

              <Button
                onClick={handleAsaasPayment}
                className="w-full h-11 gap-2 bg-primary hover:bg-primary/90"
                disabled={asaasLoading || (showCpfInput && !cpfCnpj.trim())}
              >
                {asaasLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {showCpfInput ? "Gerar PIX" : status === "active" ? "Renovar meu plano" : (status === "expired" || status === "trial_expired") ? "Renovar meu plano" : status === "trial" ? "Ativar meu plano agora" : "Pagar com PIX"}
                  </>
                )}
              </Button>


              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Seus dados são seguros e seu acesso é liberado após a confirmação do pagamento.
              </p>
            </div>
          )}
        </div>

        {/* Asaas PIX QR Code */}
        {asaasPixData && (
          <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">Pague com PIX</h3>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code ou copie o código abaixo
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl p-4">
                <img
                  src={`data:image/png;base64,${asaasPixData.qrCodeImage}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 md:w-56 md:h-56"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-2xl font-bold text-primary">R$ {asaasPixData.amount.toFixed(2)}</p>
            </div>

            {/* Copy & Paste */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código copia e cola</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={asaasPixData.payload}
                  className="bg-secondary/50 border-border text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPayload}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-400">✓ Código copiado!</p>
              )}
            </div>

            {/* Expiration */}
            {asaasPixData.expirationDate && (
              <p className="text-xs text-muted-foreground text-center">
                PIX válido até {format(new Date(asaasPixData.expirationDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}

            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-1">
              <p className="text-sm text-blue-400 text-center font-medium">
                Após o pagamento, seu plano será ativado automaticamente em alguns instantes.
              </p>
              <p className="text-xs text-blue-400/70 text-center">
                Você não precisa enviar comprovante.
              </p>
            </div>

            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() => window.location.reload()}
            >
              <CheckCircle className="h-4 w-4" />
              Já paguei — verificar ativação
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAsaasPixData(null)}
            >
              Voltar
            </Button>
          </div>
        )}

        {/* Manual payment form (fallback) */}
        {showManualForm && !asaasPixData && (
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Enviar Comprovante Manual
            </h3>

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor total a pagar</p>
              <p className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</p>
              {hasModules && (
                <p className="text-xs text-muted-foreground mt-1">
                  Plano base + {summary.modules.length} módulo{summary.modules.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Comprovante (imagem/PDF)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-10 bg-secondary/50 border-border file:text-primary file:font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Paguei via Nubank"
                className="bg-secondary/50 border-border resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowManualForm(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleManualSubmit}
                disabled={uploading}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" /> Histórico de pagamentos
            </h3>
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">R$ {p.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                  </div>
                  {statusBadge(p.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
