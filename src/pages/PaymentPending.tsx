import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Copy, LogOut, Clock, Upload, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generatePixCode } from "@/lib/pixGenerator";
import { QRCodeSVG } from "qrcode.react";

export default function PaymentPending() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [pixCode, setPixCode] = useState("");
  const [loadingPix, setLoadingPix] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [uploading, setUploading] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  useEffect(() => {
    if (!profile || !user) return;

    const loadData = async () => {
      // Check if already sent a proof
      const { data: proofs } = await (supabase.from("payment_proofs") as any)
        .select("id, status")
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (proofs && proofs.length > 0) {
        setAlreadySent(true);
      }

      // Fetch pix config
      const { data } = await supabase.from("pix_config").select("*").limit(1);
      if (data && data.length > 0 && profile?.valor_plano && profile.valor_plano > 0) {
        const config = data[0];
        const code = generatePixCode({
          chavePix: config.chave_pix,
          nomeRecebedor: config.nome_beneficiario || "",
          cidadeRecebedor: config.cidade_beneficiario || "",
          valor: profile.valor_plano,
        });
        setPixCode(code);
      }
      setLoadingPix(false);
    };
    loadData();
  }, [profile, user]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    toast({ title: "Copiado!", description: "Código Pix copiado para a área de transferência." });
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("comprovantes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("comprovantes")
        .getPublicUrl(filePath);

      await (supabase.from("payment_proofs") as any).insert({
        client_user_id: user.id,
        image_url: urlData.publicUrl,
        mensagem,
      });

      setAlreadySent(true);
      toast({ title: "Comprovante enviado!", description: "O administrador será notificado e liberará seu acesso em breve." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao enviar comprovante.", variant: "destructive" });
    }
    setUploading(false);
  };

  const valor = profile?.valor_plano || 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagamento Pendente</h1>
            <p className="text-muted-foreground mt-1">
              Olá, <strong>{profile?.nome}</strong>! Para liberar o acesso, realize o pagamento abaixo.
            </p>
          </div>
        </div>

        {/* Pix QR Code */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
          {loadingPix ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pixCode ? (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor do plano</p>
                <p className="text-3xl font-bold text-primary">R$ {valor.toFixed(2)}</p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={pixCode} size={180} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Código Pix Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input value={pixCode} readOnly className="h-10 bg-secondary/50 border-border flex-1 text-xs font-mono" />
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Dados de pagamento não configurados. Entre em contato com o administrador.
              </p>
            </div>
          )}
        </div>

        {/* Upload comprovante */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Enviar Comprovante
          </h2>

          {alreadySent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-14 w-14 rounded-2xl bg-[hsl(140_60%_45%)]/20 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-[hsl(140_60%_55%)]" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Comprovante enviado!</p>
                <p className="text-sm text-muted-foreground">
                  Aguarde a aprovação do administrador para liberar seu acesso.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Foto do comprovante *</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="h-10 bg-secondary/50 border-border file:text-primary file:font-medium"
                  />
                </div>
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
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full h-11 gap-2 bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar Comprovante"}
              </Button>
            </>
          )}
        </div>

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
