import { useState } from "react";
import { ArrowLeft, DollarSign, Plus, TrendingUp, TrendingDown, Wallet, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ModuleGate } from "@/components/modules/ModuleGate";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";

function FinanceiroContent() {
  const { entries, loading, addEntry, deleteEntry, totals } = useFinancialEntries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "entrada" | "saida">("all");
  const [form, setForm] = useState({ title: "", type: "entrada", amount: "", event_name: "", notes: "" });

  const handleSave = async () => {
    if (!form.title || !form.amount) { toast.error("Preencha título e valor"); return; }
    setSaving(true);
    const res = await addEntry({
      title: form.title,
      type: form.type,
      amount: parseFloat(form.amount),
      event_name: form.event_name || undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (res.error) { toast.error("Erro ao salvar"); return; }
    toast.success("Lançamento adicionado!");
    setForm({ title: "", type: "entrada", amount: "", event_name: "", notes: "" });
    setDialogOpen(false);
  };

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-lg font-bold text-green-500 truncate">{fmt(totals.entradas)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-lg font-bold text-red-500 truncate">{fmt(totals.saidas)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Saídas</p>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm sm:text-lg font-bold truncate ${totals.saldo >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(totals.saldo)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "entrada", "saida"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="rounded-xl text-xs"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f === "entrada" ? "Entradas" : "Saídas"}
            </Button>
          ))}
        </div>
        <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
            <DollarSign className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${e.type === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                {e.type === "entrada" ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{e.title}</p>
                {e.event_name && <p className="text-xs text-muted-foreground truncate">{e.event_name}</p>}
              </div>
              <span className={`text-sm font-bold shrink-0 ${e.type === "entrada" ? "text-green-500" : "text-red-500"}`}>
                {e.type === "entrada" ? "+" : "-"}{fmt(Number(e.amount))}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteEntry(e.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>Adicione uma entrada ou saída financeira</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Cachê do show" /></div>
            <div><Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$) *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" /></div>
            <div><Label>Evento (opcional)</Label><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} placeholder="Nome do evento" /></div>
            <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações" /></div>
            <Button className="w-full h-12 gap-2" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Financeiro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Financeiro</h1>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10 space-y-4">
        <ModuleGate moduleName="financeiro">
          <FinanceiroContent />
        </ModuleGate>
      </div>
    </div>
  );
}
