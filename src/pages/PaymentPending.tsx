import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Copy, LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generatePixCode } from "@/lib/pixGenerator";
import { QRCodeSVG } from "qrcode.react";

export default function PaymentPending() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [pixCode, setPixCode] = useState("");
  const [loadingPix, setLoadingPix] = useState(true);

  useEffect(() => {
    const loadPix = async () => {
      // Fetch admin's pix config
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
    if (profile) loadPix();
  }, [profile]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    toast({ title: "Copiado!", description: "Código Pix copiado para a área de transferência." });
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
              Olá, <strong>{profile?.nome}</strong>! Para liberar o acesso à sua agenda, realize o pagamento abaixo.
            </p>
          </div>
        </div>

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
                  <QRCodeSVG value={pixCode} size={200} />
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

              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4">
                <p className="text-sm text-yellow-300 text-center">
                  Após o pagamento, envie o comprovante ao administrador. Seu acesso será liberado em seguida.
                </p>
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

        <Button variant="ghost" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
