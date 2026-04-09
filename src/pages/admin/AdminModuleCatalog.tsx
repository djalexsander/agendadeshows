import { useState } from "react";
import { useAdminModuleCatalog } from "@/hooks/useAdminModuleCatalog";
import type { CatalogModule } from "@/hooks/useModuleCatalog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

export default function AdminModuleCatalog() {
  const { modules, loading, updateModule, toggleModuleActive } = useAdminModuleCatalog();
  const [editing, setEditing] = useState<CatalogModule | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    description: "",
    price: 0,
    billing_period: "monthly",
    sort_order: 0,
    max_users_default: 1,
  });

  const openEdit = (mod: CatalogModule) => {
    setEditing(mod);
    setForm({
      display_name: mod.display_name,
      description: mod.description || "",
      price: mod.price,
      billing_period: mod.billing_period,
      sort_order: mod.sort_order,
      max_users_default: (mod as any).max_users_default ?? 1,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const updates: any = {
      display_name: form.display_name,
      description: form.description || null,
      price: form.price,
      billing_period: form.billing_period,
      sort_order: form.sort_order,
    };
    if (editing.module_name === "agenda_compartilhada") {
      updates.max_users_default = form.max_users_default;
    }
    const { error } = await updateModule(editing.id, updates);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar módulo.");
    } else {
      toast.success("Módulo atualizado com sucesso!");
      setEditing(null);
    }
  };

  const handleToggle = async (mod: CatalogModule) => {
    const { error } = await toggleModuleActive(mod.id, !mod.active);
    if (error) toast.error("Erro ao alterar status.");
    else toast.success(`${mod.display_name} ${!mod.active ? "ativado" : "desativado"} no catálogo.`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full max-w-full overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Tag className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Catálogo de Módulos</h1>
      </div>
      <p className="text-sm text-muted-foreground">Gerencie os módulos disponíveis para os clientes.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {modules.map((mod) => (
              <div key={mod.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{mod.display_name}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate">{mod.module_name}</p>
                  </div>
                  <Switch checked={mod.active} onCheckedChange={() => handleToggle(mod)} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p>{mod.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cobrança</p>
                    <p>{mod.billing_period === "monthly" ? "Mensal" : "Único"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Ordem: {mod.sort_order}</p>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => openEdit(mod)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Nome exibido</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Cobrança</TableHead>
                <TableHead className="text-center">Ordem</TableHead>
                <TableHead className="text-center">Visível</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{mod.module_name}</TableCell>
                  <TableCell className="font-medium">{mod.display_name}</TableCell>
                  <TableCell className="text-right">
                    {mod.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>{mod.billing_period === "monthly" ? "Mensal" : "Único"}</TableCell>
                  <TableCell className="text-center">{mod.sort_order}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={mod.active} onCheckedChange={() => handleToggle(mod)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => openEdit(mod)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar módulo — {editing?.module_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Nome exibido</label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cobrança</label>
                <Select value={form.billing_period} onValueChange={(v) => setForm({ ...form, billing_period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Ordem de exibição</label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            {editing?.module_name === "agenda_compartilhada" && (
              <div>
                <label className="text-sm font-medium">Limite de usuários por empresa</label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_users_default}
                  onChange={(e) => setForm({ ...form, max_users_default: parseInt(e.target.value) || 1 })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Máximo de membros que cada empresa pode adicionar com este módulo</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
