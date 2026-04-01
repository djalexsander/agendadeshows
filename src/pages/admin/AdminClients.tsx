import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Pencil, Search, Trash2 } from "lucide-react";
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
  observacoes: string | null;
}

export default function AdminClients() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", cidade: "", estado: "",
    status_plano: "ativo", valor_plano: "", vencimento: "", observacoes: "",
  });

  const fetchClients = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setClients(data as ClientProfile[]);
  };

  useEffect(() => { fetchClients(); }, []);

  const resetForm = () => {
    setForm({
      nome: "", email: "", telefone: "", cidade: "", estado: "",
      status_plano: "ativo", valor_plano: "", vencimento: "", observacoes: "",
    });
    setEditingClient(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (c: ClientProfile) => {
    setEditingClient(c);
    setForm({
      nome: c.nome, email: c.email,
      telefone: c.telefone || "", cidade: c.cidade || "", estado: c.estado || "",
      status_plano: c.status_plano || "ativo", valor_plano: String(c.valor_plano || ""),
      vencimento: c.vencimento || "", observacoes: c.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.email) {
      toast({ title: "Erro", description: "Nome e e-mail são obrigatórios.", variant: "destructive" });
      return;
    }
    setLoading(true);

    if (editingClient) {
      // Update profile
      await supabase.from("profiles").update({
        nome: form.nome, nome_artistico: form.nome_artistico, telefone: form.telefone,
        cidade: form.cidade, estado: form.estado, status_plano: form.status_plano,
        valor_plano: form.valor_plano ? parseFloat(form.valor_plano) : 0,
        vencimento: form.vencimento || null, observacoes: form.observacoes,
      }).eq("id", editingClient.id);
      toast({ title: "Sucesso", description: "Cliente atualizado." });
    } else {
      // Create new user via edge function (preserves admin session)
      const tempPassword = form.senha_inicial || "Temp@" + Math.random().toString(36).slice(-6);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: tempPassword, nome: form.nome },
      });

      if (response.error || response.data?.error) {
        toast({ title: "Erro", description: response.data?.error || response.error?.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const newUserId = response.data?.user?.id;
      if (newUserId) {
        // Wait a moment for the trigger to create the profile
        await new Promise((r) => setTimeout(r, 1000));

        // Update the profile with additional data
        await supabase.from("profiles").update({
          nome: form.nome, nome_artistico: form.nome_artistico, telefone: form.telefone,
          cidade: form.cidade, estado: form.estado, status_plano: form.status_plano,
          valor_plano: form.valor_plano ? parseFloat(form.valor_plano) : 0,
          vencimento: form.vencimento || null, observacoes: form.observacoes,
          primeiro_acesso: true,
        }).eq("user_id", newUserId);

        // Role is auto-assigned by database trigger
        toast({ title: "Sucesso", description: `Cliente criado. Senha inicial: ${tempPassword}` });
      }
    }

    setLoading(false);
    setDialogOpen(false);
    resetForm();
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

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clients.length} cadastrado(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl">
          <UserPlus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, artístico ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-secondary/50 border-border rounded-xl"
        />
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{c.nome}</p>
              {c.nome_artistico && (
                <p className="text-sm text-primary truncate">{c.nome_artistico}</p>
              )}
              <p className="text-sm text-muted-foreground">{c.email}</p>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${
              c.status_plano === "ativo"
                ? "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]"
                : c.status_plano === "inativo"
                ? "bg-destructive/20 text-destructive"
                : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {c.status_plano || "ativo"}
            </span>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Atualize os dados do cliente" : "Cadastre um novo cliente na plataforma"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Nome Artístico</Label>
                <Input value={form.nome_artistico} onChange={(e) => setForm({ ...form, nome_artistico: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editingClient} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="h-10 bg-secondary/50 border-border" />
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
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status_plano} onValueChange={(v) => setForm({ ...form, status_plano: v })}>
                  <SelectTrigger className="h-10 bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expirado">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" value={form.valor_plano} onChange={(e) => setForm({ ...form, valor_plano: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className="h-10 bg-secondary/50 border-border" />
              </div>
            </div>
            {!editingClient && (
              <div className="space-y-1.5">
                <Label>Senha Inicial</Label>
                <Input value={form.senha_inicial} onChange={(e) => setForm({ ...form, senha_inicial: e.target.value })} placeholder="Deixe em branco para gerar automaticamente" className="h-10 bg-secondary/50 border-border" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="h-10 bg-secondary/50 border-border" />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90">
              {loading ? "Salvando..." : editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
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
    </div>
  );
}
