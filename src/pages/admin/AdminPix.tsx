import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Save, Copy, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generatePixCode } from "@/lib/pixGenerator";
import { QRCodeSVG } from "qrcode.react";

interface ClientOption {
  user_id: string;
  nome: string;
  valor_plano: number | null;
}

export default function AdminPix() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [form, setForm] = useState({
    chave_pix: "", tipo_chave: "cpf", nome_beneficiario: "",
    cidade_beneficiario: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [configRes, clientsRes] = await Promise.all([
        supabase.from("pix_config").select("*").eq("admin_user_id", user.id).limit(1),
        supabase.from("profiles").select("user_id, nome, valor_plano"),
      ]);
      if (configRes.data && configRes.data.length > 0) {
        const c = configRes.data[0];
        setConfigId(c.id);
        setForm({
          chave_pix: c.chave_pix, tipo_chave: c.tipo_chave || "cpf",
          nome_beneficiario: c.nome_beneficiario || "",
          cidade_beneficiario: c.cidade_beneficiario || "",
        });
      }
      if (clientsRes.data) {
        setClients(clientsRes.data.filter(c => c.user_id !== user.id));
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
    toast({ title: "Sucesso", description: "Dados Pix salvos." });
  };

  const handleGenerateCode = () => {
    if (!form.chave_pix || !form.nome_beneficiario || !form.cidade_beneficiario) {
      toast({ title: "Erro", description: "Preencha todos os dados Pix antes de gerar.", variant: "destructive" });
      return;
    }
    const client = clients.find(c => c.user_id === selectedClient);
    if (!client) {
      toast({ title: "Erro", description: "Selecione um cliente.", variant: "destructive" });
      return;
    }
    const valor = client.valor_plano || 0;
    if (valor <= 0) {
      toast({ title: "Atenção", description: "Este cliente não tem valor de plano cadastrado.", variant: "destructive" });
      return;
    }

    const code = generatePixCode({
      chavePix: form.chave_pix,
      nomeRecebedor: form.nome_beneficiario,
      cidadeRecebedor: form.cidade_beneficiario,
      valor,
    });
    setGeneratedCode(code);
    toast({ title: "Código gerado!", description: `Pix de R$ ${valor.toFixed(2)} para ${client.nome}` });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({ title: "Copiado!", description: "Código Pix copiado." });
  };

  const selectedClientData = clients.find(c => c.user_id === selectedClient);

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <QrCode className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuração Pix</h1>
          <p className="text-muted-foreground text-sm">Dados para cobrança</p>
        </div>
      </div>

      {/* Configuração base */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados do Recebedor</h2>
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

      {/* Gerador de cobrança */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gerar Cobrança Pix</h2>
        <div className="space-y-1.5">
          <Label>Selecionar Cliente</Label>
          <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setGeneratedCode(""); }}>
            <SelectTrigger className="h-10 bg-secondary/50 border-border">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {clients.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>
                  {c.nome} — R$ {(c.valor_plano || 0).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClientData && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
            <UserCheck className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{selectedClientData.nome}</p>
              <p className="text-sm text-muted-foreground">Valor do plano: R$ {(selectedClientData.valor_plano || 0).toFixed(2)}</p>
            </div>
          </div>
        )}

        <Button onClick={handleGenerateCode} disabled={!selectedClient || !form.chave_pix} className="w-full h-11 gap-2 bg-primary hover:bg-primary/90">
          <QrCode className="h-4 w-4" />
          Gerar QR Code e Copia e Cola
        </Button>

        {generatedCode && (
          <div className="space-y-4 pt-2">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={generatedCode} size={200} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Código Copia e Cola</Label>
              <div className="flex gap-2">
                <Input value={generatedCode} readOnly className="h-10 bg-secondary/50 border-border flex-1 text-xs font-mono" />
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
