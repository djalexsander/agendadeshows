import { useState, useEffect } from "react";
import { Copy, QrCode, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generatePixCode } from "@/lib/pixGenerator";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface PixPaymentCardProps {
  amount: number;
  title?: string;
}

interface PixConfig {
  chave_pix: string;
  tipo_chave: string | null;
  nome_beneficiario: string | null;
  cidade_beneficiario: string | null;
  copia_cola: string | null;
}

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave Aleatória",
};

export default function PixPaymentCard({ amount, title }: PixPaymentCardProps) {
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixCode, setPixCode] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("pix_config").select("*").limit(1);
      if (data && data.length > 0) {
        const c = data[0];
        setPixConfig({
          chave_pix: c.chave_pix,
          tipo_chave: c.tipo_chave,
          nome_beneficiario: c.nome_beneficiario,
          cidade_beneficiario: c.cidade_beneficiario,
          copia_cola: c.copia_cola,
        });

        // Generate Pix code
        if (c.chave_pix && amount > 0) {
          const code = generatePixCode({
            chavePix: c.chave_pix,
            nomeRecebedor: c.nome_beneficiario || "",
            cidadeRecebedor: c.cidade_beneficiario || "",
            valor: amount,
          });
          setPixCode(code);
        }
      }
      setLoading(false);
    };
    load();
  }, [amount]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 flex justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pixConfig || !pixConfig.chave_pix) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
            <QrCode className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Forma de pagamento ainda não configurada. Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  const effectiveCode = pixConfig.copia_cola || pixCode;

  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <QrCode className="h-4 w-4" />
        {title || "Dados para pagamento Pix"}
      </h3>

      {/* Amount */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
        <p className="text-3xl font-bold text-primary">R$ {amount.toFixed(2)}</p>
      </div>

      {/* QR Code */}
      {effectiveCode && (
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={effectiveCode} size={180} />
          </div>
        </div>
      )}

      {/* Pix Key */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Chave Pix ({KEY_TYPE_LABELS[pixConfig.tipo_chave || ""] || pixConfig.tipo_chave || "—"})
        </Label>
        <div className="flex gap-2">
          <Input
            value={pixConfig.chave_pix}
            readOnly
            className="h-10 bg-secondary/50 border-border flex-1 text-sm font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => copyText(pixConfig.chave_pix, "Chave Pix")}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Copia e Cola */}
      {effectiveCode && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pix Copia e Cola</Label>
          <div className="flex gap-2">
            <Input
              value={effectiveCode}
              readOnly
              className="h-10 bg-secondary/50 border-border flex-1 text-xs font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => copyText(effectiveCode, "Código Pix")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Recipient info */}
      {pixConfig.nome_beneficiario && (
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p><span className="font-medium text-foreground">Recebedor:</span> {pixConfig.nome_beneficiario}</p>
          {pixConfig.cidade_beneficiario && (
            <p><span className="font-medium text-foreground">Cidade:</span> {pixConfig.cidade_beneficiario}</p>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-xl bg-secondary/30 border border-border p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Faça o pagamento via Pix e depois envie o comprovante abaixo para liberar seu acesso.
        </p>
      </div>
    </div>
  );
}
