import { useState, useEffect } from "react";
import { ArrowLeft, Users, Plus, Mail, Shield, Eye, Pencil, Trash2, Loader2, UserPlus, X, ToggleLeft, ToggleRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCompany, CompanyRole } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { ModuleGate } from "@/components/modules/ModuleGate";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: Record<CompanyRole, string> = {
  admin: "Admin",
  collaborator: "Colaborador",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<CompanyRole, string> = {
  admin: "bg-primary/20 text-primary",
  collaborator: "bg-blue-500/20 text-blue-400",
  viewer: "bg-muted text-muted-foreground",
};

const ROLE_ICONS: Record<CompanyRole, typeof Shield> = {
  admin: Shield,
  collaborator: Pencil,
  viewer: Eye,
};

export default function CompanyUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    company, members, invitations, isCompanyAdmin,
    inviteMember, linkExistingUser, updateMemberRole,
    toggleMemberActive, removeMember, cancelInvitation,
  } = useCompany();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"invite" | "link">("invite");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("viewer");
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const [maxUsers, setMaxUsers] = useState(1);

  useEffect(() => {
    supabase
      .from("module_catalog")
      .select("max_users_default")
      .eq("module_name", "agenda_compartilhada")
      .single()
      .then(({ data }) => {
        if (data) setMaxUsers((data as any).max_users_default ?? 1);
      });
  }, []);

  const atLimit = members.length >= maxUsers;

  const handleAdd = async () => {
    if (!email) { toast.error("Preencha o e-mail"); return; }
    if (atLimit) {
      toast.error(`Limite de ${maxUsers} usuário(s) atingido. Solicite aumento ao administrador.`);
      return;
    }
    setSaving(true);
    const res = mode === "invite"
      ? await inviteMember(email, role)
      : await linkExistingUser(email, role);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(mode === "invite" ? "Convite enviado!" : "Membro vinculado!");
    setEmail("");
    setRole("viewer");
    setDialogOpen(false);
  };

  if (!isCompanyAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Equipe da Empresa</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10 space-y-6">
        <ModuleGate
          moduleName="agenda_compartilhada"
          title="Agenda Compartilhada"
          description="Sua empresa contrata e compartilha a agenda com a equipe. Ative o módulo para adicionar usuários sem que cada membro precise de assinatura própria."
        >
        {/* Company name */}
        {company && (
          <div className="rounded-xl bg-secondary/40 border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="font-semibold text-foreground">{company.name}</p>
          </div>
        )}

        {/* Members */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{members.length}/{maxUsers} membro{maxUsers !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Membros acessam a agenda sem assinatura própria</p>
            </div>
            <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setDialogOpen(true)} disabled={atLimit}>
              <UserPlus className="h-4 w-4" /> Adicionar membro
            </Button>
          </div>
          {atLimit && (
            <p className="text-xs text-orange-400 bg-orange-500/10 rounded-lg px-3 py-2">
              Limite de {maxUsers} usuário(s) atingido. Solicite aumento ao administrador da plataforma.
            </p>
          )}

          {members.map((m) => {
            const RoleIcon = ROLE_ICONS[m.role as CompanyRole] || Eye;
            const isOwner = m.user_id === company?.owner_user_id;
            const isSelf = m.user_id === user?.id;

            return (
              <div key={m.id} className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <RoleIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm truncate">
                      {m.profile?.nome || "Usuário"}
                    </p>
                    {isOwner && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Dono</Badge>}
                    {!m.active && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Inativo</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{m.profile?.email}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[m.role as CompanyRole]}`}>
                      {ROLE_LABELS[m.role as CompanyRole]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Desde {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                {!isOwner && !isSelf && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Select
                      value={m.role}
                      onValueChange={(v) => updateMemberRole(m.id, v as CompanyRole)}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="collaborator">Colaborador</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => toggleMemberActive(m.id, !m.active)}
                    >
                      {m.active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setRemoveTarget(m.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Convites pendentes</p>
            {invitations.map((inv) => (
              <div key={inv.id} className="rounded-xl bg-secondary/40 border border-border/50 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                  <Send className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[inv.role]}`}>
                      {ROLE_LABELS[inv.role]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Expira em {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelInvitation(inv.id)}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        </ModuleGate>
      </div>

      {/* Add member dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
         <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Adicionar membro à empresa</DialogTitle>
            <DialogDescription>Convide ou vincule um membro da equipe. Ele terá acesso à agenda da empresa sem precisar de assinatura própria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                variant={mode === "invite" ? "default" : "outline"}
                size="sm" className="flex-1"
                onClick={() => setMode("invite")}
              >
                <Mail className="h-4 w-4 mr-1" /> Convidar
              </Button>
              <Button
                variant={mode === "link" ? "default" : "outline"}
                size="sm" className="flex-1"
                onClick={() => setMode("link")}
              >
                <UserPlus className="h-4 w-4 mr-1" /> Vincular existente
              </Button>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "invite" ? "email@exemplo.com" : "e-mail do usuário cadastrado"}
              />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as CompanyRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — acesso total</SelectItem>
                  <SelectItem value="collaborator">Colaborador — edição parcial</SelectItem>
                  <SelectItem value="viewer">Visualizador — apenas visualização</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 gap-2" disabled={saving} onClick={handleAdd}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Salvando..." : mode === "invite" ? "Enviar convite" : "Vincular"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>Este usuário perderá acesso à empresa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (removeTarget) removeMember(removeTarget); setRemoveTarget(null); }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
