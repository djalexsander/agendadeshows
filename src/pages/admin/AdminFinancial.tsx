import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Plus, Pencil, Trash2, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
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

interface Payment {
  id: string;
  client_user_id: string;
  valor: number;
  status: string | null;
  forma_pagamento: string | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  client_name?: string;
}

interface ClientOption { user_id: string; nome: string; }

export default function AdminFinancial() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    client_user_id: "", valor: "", status: "pendente", forma_pagamento: "pix",
    data_vencimento: "", data_pagamento: "", observacoes: "",
  });

  const fetchData = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, nome");
    if (profiles) setClients(profiles);

    const { data: pays } = await supabase.from("payments").select("*").order("data_vencimento", { ascending: false });
    if (pays && profiles) {
      const map = new Map(profiles.map((p) => [p.user_id, p.nome]));
      setPayments(pays.map((p) => ({ ...p, client_name: map.get(p.client_user_id) || "—" })));
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ client_user_id: "", valor: "", status: "pendente", forma_pagamento: "pix", data_vencimento: "", data_pagamento: "", observacoes: "" });
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      client_user_id: p.client_user_id, valor: String(p.valor), status: p.status || "pendente",
      forma_pagamento: p.forma_pagamento || "pix", data_vencimento: p.data_vencimento || "",
      data_pagamento: p.data_pagamento || "", observacoes: p.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_user_id || !form.valor) {
      toast({ title: "Erro", description: "Cliente e valor são obrigatórios.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const payload = {
      client_user_id: form.client_user_id,
      valor: parseFloat(form.valor),
      status: form.status,
      forma_pagamento: form.forma_pagamento,
      data_vencimento: form.data_vencimento || null,
      data_pagamento: form.data_pagamento || null,
      observacoes: form.observacoes,
    };

    if (editing) {
      await supabase.from("payments").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("payments").insert(payload);
    }

    setLoading(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
    toast({ title: "Sucesso", description: editing ? "Pagamento atualizado." : "Pagamento registrado." });
  };

  const statusColor = (s: string | null) => {
    switch (s) {
      case "pago": return "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]";
      case "atrasado": return "bg-destructive/20 text-destructive";
      case "cancelado": return "bg-muted text-muted-foreground";
      default: return "bg-yellow-500/20 text-yellow-400";
    }
  };

  const totalRecebido = payments.filter(p => p.status === "pago").reduce((s, p) => s + p.valor, 0);
  const totalPendente = payments.filter(p => p.status === "pendente").reduce((s, p) => s + p.valor, 0);
  const qtdPago = payments.filter(p => p.status === "pago").length;
  const qtdPendente = payments.filter(p => p.status === "pendente").length;

  const summaryCards = [
    { label: "Recebido", valor: totalRecebido, qtd: qtdPago, icon: CheckCircle, color: "bg-[hsl(140_60%_45%)]/15 text-[hsl(140_60%_55%)]" },
    { label: "Pendente", valor: totalPendente, qtd: qtdPendente, icon: Clock, color: "bg-yellow-500/15 text-yellow-400" },
    { label: "Total Geral", valor: totalRecebido + totalPendente, qtd: payments.length, icon: DollarSign, color: "bg-primary/15 text-primary" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Controle de pagamentos</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> Novo Pagamento
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-card border border-border p-5 space-y-2">
            <div className={`h-10 w-10 rounded-xl ${card.color} flex items-center justify-center`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">R$ {card.valor.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{card.label} ({card.qtd})</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.client_name}</p>
              <p className="text-sm text-muted-foreground">
                R$ {p.valor.toFixed(2)} • {p.forma_pagamento}
                {p.data_vencimento && ` • Venc: ${format(parseISO(p.data_vencimento), "dd/MM/yyyy")}`}
              </p>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${statusColor(p.status)}`}>
              {p.status || "pendente"}
            </span>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(p)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {payments.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle>
            <DialogDescription>Registrar pagamento de cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.client_user_id} onValueChange={(v) => setForm({ ...form, client_user_id: v })}>
                <SelectTrigger className="h-10 bg-secondary/50 border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {clients.map((c) => <SelectItem key={c.user_id} value={c.user_id}>{c.nome || c.user_id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-10 bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger className="h-10 bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Data do Pagamento</Label>
              <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} className="h-10 bg-secondary/50 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="h-10 bg-secondary/50 border-border" />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pagamento de <strong>{deleteTarget?.client_name}</strong> (R$ {deleteTarget?.valor.toFixed(2)})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                setLoading(true);
                await supabase.from("payments").delete().eq("id", deleteTarget.id);
                setLoading(false);
                setDeleteTarget(null);
                fetchData();
                toast({ title: "Excluído", description: "Pagamento removido." });
              }}
            >
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
