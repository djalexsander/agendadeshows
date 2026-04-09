import { useState } from "react";
import { ArrowLeft, Users, Plus, Phone, Mail, Trash2, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ModuleGate } from "@/components/modules/ModuleGate";
import { useTeamMembers } from "@/hooks/useTeamMembers";

function EquipeContent() {
  const { members, loading, addMember, deleteMember } = useTeamMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", notes: "" });

  const handleSave = async () => {
    if (!form.name) { toast.error("Preencha o nome"); return; }
    setSaving(true);
    const res = await addMember({
      name: form.name,
      role: form.role || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (res.error) { toast.error("Erro ao salvar"); return; }
    toast.success("Membro adicionado!");
    setForm({ name: "", role: "", phone: "", email: "", notes: "" });
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} membro{members.length !== 1 ? "s" : ""}</p>
        <Button className="rounded-xl gap-1.5 h-11 px-4" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Nenhum membro cadastrado</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Adicione pessoas da sua equipe</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{m.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {m.role && <span className="text-xs text-muted-foreground">{m.role}</span>}
                  {m.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                  {m.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteMember(m.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo membro</DialogTitle>
            <DialogDescription>Adicione uma pessoa à sua equipe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input className="h-12" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" /></div>
            <div className="space-y-1.5"><Label>Função</Label><Input className="h-12" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Ex: Técnico de som" /></div>
            <div className="space-y-1.5"><Label>Telefone</Label><Input className="h-12" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" inputMode="tel" /></div>
            <div className="space-y-1.5"><Label>E-mail</Label><Input className="h-12" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Input className="h-12" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações" /></div>
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

export default function Equipe() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-4 pb-3 sticky top-0 z-40 bg-background/95 backdrop-blur-sm" style={{ paddingTop: 'calc(var(--safe-area-top) + 0.75rem)' }}>
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0 h-11 w-11" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Equipe</h1>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10 space-y-4" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 2.5rem)' }}>
        <ModuleGate moduleName="equipe">
          <EquipeContent />
        </ModuleGate>
      </div>
    </div>
  );
}
