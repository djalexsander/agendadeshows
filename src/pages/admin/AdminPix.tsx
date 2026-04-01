import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function AdminPix() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [form, setForm] = useState({
    chave_pix: "", tipo_chave: "cpf", nome_beneficiario: "",
    cidade_beneficiario: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from("pix_config").select("*").eq("admin_user_id", user.id).limit(1);
      if (data && data.length > 0) {
        const c = data[0];
        setConfigId(c.id);
        setForm({
          chave_pix: c.chave_pix, tipo_chave: c.tipo_chave || "cpf",
          nome_beneficiario: c.nome_beneficiario || "",
          cidade_beneficiario: c.cidade_beneficiario || "",
        });
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const payload = {
      admin_user_id: user.id,
      chave_pix: form.chave_pix, tipo_chave: form.tipo_chave,
      nome_beneficiario: form.nome_beneficiario,
      cidade_beneficiario: form.cidade_beneficiario,
    };

    if (configId) {
      await supabase.from("pix_config").update(payload).eq("id", configId);
    } else {
      const { data } = await supabase.from("pix_config").insert(payload).select().single();
      if (data) setConfigId(data.id);
    }

    setLoading(false);
    toast({ title: "Sucesso", description: "Dados Pix salvos. O QR Code será gerado automaticamente para cada cliente com base no valor do plano." });
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <QrCode className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuração Pix</h1>
          <p className="text-muted-foreground text-sm">Dados para cobrança automática</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de Chave</Label>
            <Select value={form.tipo_chave} onValueChange={(v) => setForm({ ...form, tipo_chave: v })}>
              <SelectTrigger className="h-10 bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Chave Pix</Label>
            <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} className="h-10 bg-secondary/50 border-border" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nome do Beneficiário</Label>
            <Input value={form.nome_beneficiario} onChange={(e) => setForm({ ...form, nome_beneficiario: e.target.value })} className="h-10 bg-secondary/50 border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>Cidade do Beneficiário</Label>
            <Input value={form.cidade_beneficiario} onChange={(e) => setForm({ ...form, cidade_beneficiario: e.target.value })} className="h-10 bg-secondary/50 border-border" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full h-11 gap-2 bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Configuração Pix"}
        </Button>
      </div>

      <div className="rounded-xl bg-secondary/30 border border-border p-4">
        <p className="text-sm text-muted-foreground text-center">
          💡 O QR Code e o código Pix copia e cola são gerados automaticamente para cada cliente na tela de pagamento, com base no valor do plano cadastrado.
        </p>
      </div>
    </div>
  );
}
