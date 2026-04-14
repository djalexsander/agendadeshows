import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Copy, LogOut, Clock, Send, CheckCircle, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AsaasPixData {
  paymentId: string;
  asaasPaymentId: string;
  payload: string;
  qrCodeImage: string;
  expirationDate: string;
  amount: number;
  reused: boolean;
}

export default function PaymentPending() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  // Asaas PIX state
  const [asaasLoading, setAsaasLoading] = useState(false);
  const [asaasPixData, setAsaasPixData] = useState<AsaasPixData | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [showCpfInput, setShowCpfInput] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manual fallback state
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [uploading, setUploading] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if already sent a proof
    (supabase.from("payment_proofs") as any)
      .select("id, status")
      .eq("client_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }: any) => {
        if (data && data.length > 0) setAlreadySent(true);
      });

    // Check for existing Asaas pending payment
    (supabase.from("base_plan_payments") as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending_review")
      .eq("gateway_provider", "asaas")
      .not("pix_payload", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          const p = data[0];
          if (p.pix_expiration_date && new Date(p.pix_expiration_date) > new Date()) {
            setAsaasPixData({
              paymentId: p.id,
              asaasPaymentId: p.asaas_payment_id,
              payload: p.pix_payload,
              qrCodeImage: p.pix_qr_code_image,
              expirationDate: p.pix_expiration_date,
              amount: p.amount,
              reused: true,
            });
          }
        }
      });
  }, [user]);

  const handleAsaasPayment = async () => {
    if (!user) return;

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
        toast({ title: "Erro", description: "Não foi possível gerar o PIX. Tente o envio manual.", variant: "destructive" });
        setAsaasLoading(false);
        return;
      }

      setAsaasPixData(data as AsaasPixData);
      setShowCpfInput(false);
      toast({
        title: data?.reused ? "PIX existente" : "PIX gerado!",
        description: data?.reused
          ? "Você já tem um PIX pendente. Use o código abaixo."
          : "Escaneie o QR Code ou copie o código para pagar.",
      });
    } catch (err) {
      console.error("Asaas error:", err);
      toast({ title: "Erro", description: "Falha ao gerar pagamento.", variant: "destructive" });
    }
    setAsaasLoading(false);
  };

  const handleCopyPayload = async () => {
    if (!asaasPixData?.payload) return;
    try {
      await navigator.clipboard.writeText(asaasPixData.payload);
      setCopied(true);
      toast({ title: "Copiado!", description: "Código PIX copiado." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  const handleManualUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("comprovantes").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("comprovantes").getPublicUrl(filePath);
      await (supabase.from("payment_proofs") as any).insert({
        client_user_id: user.id,
        image_url: urlData.publicUrl,
        mensagem,
      });
      await supabase.from("profiles").update({ status_plano: "pagamento_em_analise" }).eq("user_id", user.id);
      setAlreadySent(true);
      toast({ title: "Comprovante enviado!", description: "O administrador liberará seu acesso em breve." });
      supabase.functions.invoke("send-push", {
        body: {
          title: "📎 Novo Comprovante",
          body: `${profile?.nome || "Um cliente"} enviou um comprovante de pagamento.`,
          url: "/admin",
          target_role: "admin",
        },
      }).catch(() => {});
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao enviar.", variant: "destructive" });
    }
    setUploading(false);
  };

  const valor = profile?.valor_plano || 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Realize seu Pagamento</h1>
            <p className="text-muted-foreground mt-1">
              Olá, <strong>{profile?.nome}</strong>! Para liberar o acesso, realize o pagamento abaixo.
            </p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-[hsl(140_60%_45%)]/20 flex items-center justify-center text-[10px] font-bold text-[hsl(140_60%_55%)]">✓</div>
            <p className="text-xs text-muted-foreground">Conta criada</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-[hsl(140_60%_45%)]/20 flex items-center justify-center text-[10px] font-bold text-[hsl(140_60%_55%)]">✓</div>
            <p className="text-xs text-muted-foreground">Plano selecionado</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-[10px] font-bold text-yellow-400">3</div>
            <p className="text-xs font-semibold">Realizar pagamento PIX</p>
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">4</div>
            <p className="text-xs">Acesso liberado</p>
          </div>
        </div>

        {/* Valor */}
        {valor > 0 && !asaasPixData && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Valor do plano</p>
            <p className="text-3xl font-bold text-primary">R$ {valor.toFixed(2)}</p>
          </div>
        )}

        {/* Asaas PIX QR Code */}
        {asaasPixData ? (
          <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">Pague com PIX</h3>
              <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o código</p>
            </div>

            <div className="flex justify-center">
              <div className="bg-white rounded-xl p-4">
                <img
                  src={`data:image/png;base64,${asaasPixData.qrCodeImage}`}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-2xl font-bold text-primary">R$ {asaasPixData.amount.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código copia e cola</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={asaasPixData.payload}
                  className="bg-secondary/50 border-border text-xs font-mono flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleCopyPayload} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-green-400">✓ Código copiado!</p>}
            </div>

            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-1">
              <p className="text-sm text-blue-400 text-center font-medium">
                Após o pagamento, seu plano será ativado automaticamente em alguns instantes.
              </p>
            </div>

            {/* Manual fallback link */}
            <button
              onClick={() => setShowManualFallback(!showManualFallback)}
              className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
            >
              Já pagou? Envie o comprovante manualmente
            </button>
          </div>
        ) : alreadySent ? (
          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-14 w-14 rounded-2xl bg-[hsl(140_60%_45%)]/20 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-[hsl(140_60%_55%)]" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Comprovante enviado!</p>
                <p className="text-sm text-muted-foreground">Aguarde a aprovação do administrador.</p>
              </div>
            </div>
          </div>
        ) : (
          /* CTA to generate Asaas PIX */
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            {showCpfInput && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">CPF ou CNPJ (obrigatório para gerar PIX)</Label>
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
              className="w-full h-12 gap-2 bg-primary hover:bg-primary/90 text-base"
              disabled={asaasLoading || (showCpfInput && !cpfCnpj.trim())}
            >
              {asaasLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  {showCpfInput ? "Gerar PIX" : "Pagar com PIX"}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              O pagamento é processado automaticamente via PIX
            </p>

            <button
              onClick={() => setShowManualFallback(!showManualFallback)}
              className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
            >
              Prefere enviar comprovante manualmente?
            </button>
          </div>
        )}

        {/* Manual fallback form */}
        {showManualFallback && !alreadySent && (
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Enviar Comprovante Manual
            </h2>
            <div className="space-y-1.5">
              <Label>Foto do comprovante *</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-10 bg-secondary/50 border-border file:text-primary file:font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem (opcional)</Label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex: Paguei via Nubank às 14h"
                className="bg-secondary/50 border-border resize-none"
                rows={2}
              />
            </div>
            <Button
              onClick={handleManualUpload}
              disabled={!file || uploading}
              className="w-full h-11 gap-2 bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Enviando..." : "Enviar Comprovante"}
            </Button>
          </div>
        )}

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}