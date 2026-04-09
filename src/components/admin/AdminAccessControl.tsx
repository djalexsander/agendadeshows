import { useState, useEffect } from "react";
import {
  Shield, ShieldCheck, ShieldOff, History, Puzzle, Crown,
  Loader2, Check, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useManualOverrides,
  grantManualPlan, revokeManualPlan,
  grantManualModule, revokeManualModule,
} from "@/hooks/useManualOverrides";
import { useModuleCatalog } from "@/hooks/useModuleCatalog";
import { supabase } from "@/integrations/supabase/client";

const PLAN_OPTIONS = [
  { value: "basic", label: "Básico" },
  { value: "premium", label: "Premium" },
  { value: "lifetime", label: "Vitalício" },
];

const REASON_PRESETS = [
  "Cliente parceiro",
  "Cortesia",
  "Divulgação",
  "Acesso vitalício",
  "Teste especial",
  "Suporte comercial",
];

const ORIGIN_BADGES: Record<string, { label: string; class: string }> = {
  manual: { label: "Manual", class: "bg-purple-500/20 text-purple-400" },
  payment: { label: "Pago", class: "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]" },
  trial: { label: "Trial", class: "bg-blue-500/20 text-blue-400" },
  free: { label: "Free", class: "bg-muted text-muted-foreground" },
  inactive: { label: "Inativo", class: "bg-muted text-muted-foreground" },
};

function OriginBadge({ origin }: { origin: string }) {
  const badge = ORIGIN_BADGES[origin] || ORIGIN_BADGES.inactive;
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-lg ${badge.class}`}>
      {badge.label}
    </span>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
}

export function AdminAccessControlDialog({ open, onOpenChange, targetUserId, targetUserName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { planOverride, moduleOverrides, auditLogs, loading, refresh } = useManualOverrides(open ? targetUserId : null);
  const { modules: catalog } = useModuleCatalog();

  // Active paid modules for this user
  const [paidModules, setPaidModules] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plan form
  const [planEnabled, setPlanEnabled] = useState(false);
  const [planCode, setPlanCode] = useState("basic");
  const [planReason, setPlanReason] = useState("");
  const [planNotes, setPlanNotes] = useState("");

  // Module actions
  const [moduleReason, setModuleReason] = useState("");

  useEffect(() => {
    if (!open || !targetUserId) return;
    // Fetch paid modules
    (supabase.from("user_modules") as any)
      .select("module_name")
      .eq("user_id", targetUserId)
      .eq("active", true)
      .then(({ data }: any) => {
        setPaidModules((data || []).map((d: any) => d.module_name));
      });
  }, [open, targetUserId]);

  // Sync form with current override
  useEffect(() => {
    if (planOverride) {
      setPlanEnabled(true);
      setPlanCode(planOverride.plan_code);
      setPlanReason(planOverride.reason || "");
      setPlanNotes(planOverride.notes || "");
    } else {
      setPlanEnabled(false);
      setPlanCode("basic");
      setPlanReason("");
      setPlanNotes("");
    }
  }, [planOverride]);

  const handleSavePlan = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (planEnabled) {
        await grantManualPlan({
          targetUserId,
          planCode,
          reason: planReason || undefined,
          notes: planNotes || undefined,
          adminUserId: user.id,
        });
        toast({ title: "Plano manual ativado", description: `Plano "${planCode}" liberado para ${targetUserName}.` });
      } else if (planOverride) {
        await revokeManualPlan({
          targetUserId,
          adminUserId: user.id,
          currentPlanCode: planOverride.plan_code,
          reason: planReason || undefined,
        });
        toast({ title: "Plano manual revogado", description: `Override de plano removido de ${targetUserName}.` });
      }
      await refresh();
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar plano.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleToggleModule = async (moduleName: string, active: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      if (active) {
        await grantManualModule({
          targetUserId,
          moduleName,
          reason: moduleReason || undefined,
          adminUserId: user.id,
        });
        toast({ title: "Módulo liberado", description: `"${moduleName}" ativado manualmente.` });
      } else {
        await revokeManualModule({
          targetUserId,
          moduleName,
          adminUserId: user.id,
          reason: moduleReason || undefined,
        });
        toast({ title: "Módulo revogado", description: `Override manual de "${moduleName}" removido.` });
      }
      await refresh();
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar módulo.", variant: "destructive" });
    }
    setSaving(false);
  };

  const getModuleOrigin = (moduleName: string): string => {
    if (moduleOverrides.some((m) => m.module_name === moduleName)) return "manual";
    if (paidModules.includes(moduleName)) return "payment";
    return "inactive";
  };

  const isModuleManual = (moduleName: string) =>
    moduleOverrides.some((m) => m.module_name === moduleName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl mx-4 rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Controle de Acesso — {targetUserName}
          </DialogTitle>
          <DialogDescription>
            Gerencie plano e módulos manualmente. Alterações não geram cobrança.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* ── PLAN SECTION ── */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Plano Base</h3>
                </div>
                {planOverride && <OriginBadge origin="manual" />}
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Liberar plano manualmente</Label>
                <Switch checked={planEnabled} onCheckedChange={setPlanEnabled} />
              </div>

              {planEnabled && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plano</Label>
                    <Select value={planCode} onValueChange={setPlanCode}>
                      <SelectTrigger className="h-9 bg-secondary/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {PLAN_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motivo</Label>
                    <Select value={planReason} onValueChange={setPlanReason}>
                      <SelectTrigger className="h-9 bg-secondary/50 border-border">
                        <SelectValue placeholder="Selecione ou digite" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {REASON_PRESETS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      value={planNotes}
                      onChange={(e) => setPlanNotes(e.target.value)}
                      placeholder="Notas internas..."
                      className="min-h-[60px] bg-secondary/50 border-border text-sm"
                    />
                  </div>
                </div>
              )}

              <Button
                size="sm"
                onClick={handleSavePlan}
                disabled={saving}
                className="w-full rounded-xl"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Salvar plano
              </Button>
            </div>

            {/* ── MODULES SECTION ── */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Módulos</h3>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Motivo (para todos os módulos alterados)</Label>
                <Select value={moduleReason} onValueChange={setModuleReason}>
                  <SelectTrigger className="h-9 bg-secondary/50 border-border">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {REASON_PRESETS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {catalog.map((mod) => {
                  const origin = getModuleOrigin(mod.module_name);
                  const isManual = isModuleManual(mod.module_name);
                  const isPaid = paidModules.includes(mod.module_name);
                  const isActive = isManual || isPaid;

                  return (
                    <div
                      key={mod.module_name}
                      className={`rounded-lg border px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                        isManual
                          ? "border-purple-500/30 bg-purple-500/5"
                          : isPaid
                          ? "border-[hsl(140_60%_45%)]/30 bg-[hsl(140_60%_45%)]/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{mod.display_name}</span>
                        <OriginBadge origin={origin} />
                      </div>
                      <Switch
                        checked={isManual}
                        disabled={saving}
                        onCheckedChange={(checked) => handleToggleModule(mod.module_name, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── HISTORY SECTION ── */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Histórico</h3>
                  <span className="text-xs text-muted-foreground">({auditLogs.length})</span>
                </div>
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showHistory && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro</p>
                  )}
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg bg-card border border-border p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {log.action_type === "grant_plan" && "✅ Plano liberado"}
                          {log.action_type === "revoke_plan" && "❌ Plano revogado"}
                          {log.action_type === "grant_module" && "✅ Módulo liberado"}
                          {log.action_type === "revoke_module" && "❌ Módulo revogado"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.performed_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.resource_type === "plan" ? "Plano" : "Módulo"}: <strong>{log.resource_code}</strong>
                      </p>
                      {log.reason && (
                        <p className="text-[10px] text-muted-foreground">Motivo: {log.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
