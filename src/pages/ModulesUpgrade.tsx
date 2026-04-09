import { useState, useEffect } from "react";
import {
  Puzzle, DollarSign, Users, UsersRound, FileBarChart, ImageDown, MapPinned, ArrowLeft,
  CheckCircle2, Sparkles, Clock, Loader2, XCircle, Plus, Minus, Copy, RefreshCw, AlertTriangle, Zap,
  ShieldCheck, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useModules, type ModuleName } from "@/hooks/useModules";
import { useModuleRequests } from "@/hooks/useModuleRequests";
import { useModuleCatalog, type CatalogModule } from "@/hooks/useModuleCatalog";
import { useClientModulePayments } from "@/hooks/useClientModulePayments";
import { useTrialModuleSelections } from "@/hooks/useTrialModuleSelections";
import { useSubscriptionSummary } from "@/hooks/useSubscriptionSummary";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { getEffectivePlanStatus } from "@/lib/planStatus";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ElementType> = {
  financeiro: DollarSign,
  equipe: Users,
  relatorios: FileBarChart,
  export_png: ImageDown,
  gps: MapPinned,
  agenda_compartilhada: UsersRound,
};

function formatPrice(price: number, billingPeriod: string) {
  const formatted = price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return billingPeriod === "monthly" ? `${formatted}/mês` : `${formatted} único`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface PixPaymentData {
  paymentId: string;
  payload: string;
  qrCodeImage: string;
  expirationDate: string;
  amount: number;
  moduleName: string;
}

function GracePeriodBanner() {
  const { isGracePeriod, graceDaysLeft, isTrialExpired, hadTrial } = useTrialStatus();

  if (!hadTrial || !isTrialExpired) return null;

  if (isGracePeriod) {
    return (
      <div className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/10 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-yellow-400 text-base">Oferta especial de conversão</h3>
            <p className="text-sm text-yellow-400/80">
              Você ainda tem <strong>{graceDaysLeft} dia{graceDaysLeft !== 1 ? "s" : ""}</strong> para ativar módulos com condições especiais.
            </p>
          </div>
        </div>
        <p className="text-xs text-yellow-400/70">
          Seu teste gratuito terminou, mas seu plano básico continua ativo. Ative os módulos que você usou durante o trial para não perder o acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
      <p className="text-sm text-muted-foreground">
        Seu teste gratuito terminou. Ative os módulos abaixo para desbloquear funcionalidades extras.
      </p>
    </div>
  );
}

function SubscriptionSummaryCard() {
  const { isTrialActive } = useTrialStatus();
  const summary = useSubscriptionSummary();
  const navigate = useNavigate();

  if (summary.loading) return null;

  const hasSelectedModules = summary.modules.length > 0;

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-foreground">Resumo da assinatura</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{summary.basePlanName}</span>
          <span className="font-medium text-foreground">{formatCurrency(summary.basePrice)}/mês</span>
        </div>

        {summary.modules.map((m) => (
          <div key={m.module_name} className="flex items-center justify-between">
            <span className="text-muted-foreground">+ {m.display_name}</span>
            <span className="font-medium text-foreground">{formatCurrency(m.price)}/mês</span>
          </div>
        ))}

        <div className="border-t border-border pt-2 flex items-center justify-between">
          <span className="font-bold text-foreground">Total mensal</span>
          <span className="font-bold text-primary text-lg">{formatCurrency(summary.total)}/mês</span>
        </div>
      </div>

      {hasSelectedModules && (
        <Button
          className="w-full rounded-xl gap-2"
          size="lg"
          onClick={() => navigate("/meu-plano")}
        >
          <Sparkles className="h-4 w-4" />
          Ativar plano com meus módulos
        </Button>
      )}

      {!hasSelectedModules && (
        <p className="text-xs text-muted-foreground text-center">
          Selecione módulos acima para montar seu plano.
        </p>
      )}
    </div>
  );
}

export default function ModulesUpgrade() {
  const { user, profile } = useAuth();
  const { isTrialActive, trialDaysLeft } = useTrialStatus();
  const { hasModule, getModuleOrigin, loading: modulesLoading, refreshModules } = useModules();
  const { hasPendingRequest, loading: requestsLoading } = useModuleRequests();
  const { modules: catalog, loading: catalogLoading } = useModuleCatalog();
  const { hasPendingPayment, getLatestPayment, createAsaasModulePayment, refreshPayments, loading: paymentsLoading } = useClientModulePayments();
  const { isSelected, toggleModule, loading: selectionsLoading } = useTrialModuleSelections();
  const navigate = useNavigate();

  const planStatus = getEffectivePlanStatus(profile);
  const isPreSubscription =
    planStatus === "trial" ||
    planStatus === "trial_expired" ||
    planStatus === "pending_plan_choice" ||
    planStatus === "pending_payment" ||
    planStatus === "expired";

  const [toggling, setToggling] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixModuleName, setPixModuleName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loading = modulesLoading || requestsLoading || catalogLoading || paymentsLoading || selectionsLoading;

  const getModuleStatus = (mod: CatalogModule): "trial_unlocked" | "active" | "manual" | "pending" | "rejected" | "selected" | "available" => {
    // Manual override takes highest priority
    if (getModuleOrigin(mod.module_name) === "manual") return "manual";
    // During trial: all modules are unlocked (not "active")
    if (isTrialActive) {
      return isSelected(mod.module_name) ? "selected" : "trial_unlocked";
    }
    if (hasModule(mod.module_name as ModuleName)) return "active";
    if (isPreSubscription && isSelected(mod.module_name)) return "selected";
    if (hasPendingPayment(mod.module_name) || hasPendingRequest(mod.module_name as ModuleName)) return "pending";
    const latest = getLatestPayment(mod.module_name);
    if (latest && latest.status === "rejected") return "rejected";
    return "available";
  };

  const handleToggleTrialModule = async (mod: CatalogModule) => {
    setToggling(mod.module_name);
    await toggleModule(mod.module_name);
    const wasSelected = isSelected(mod.module_name);
    toast.success(wasSelected ? `"${mod.display_name}" removido do plano` : `"${mod.display_name}" adicionado ao plano`);
    setToggling(null);
  };

  const handleContractModule = async (mod: CatalogModule) => {
    setPixLoading(true);
    setPixModuleName(mod.module_name);
    const { data, error } = await createAsaasModulePayment(mod.module_name);
    if (error) {
      toast.error(error);
      setPixLoading(false);
      setPixModuleName(null);
      return;
    }
    if (data) {
      setPixData({
        paymentId: data.paymentId,
        payload: data.payload,
        qrCodeImage: data.qrCodeImage,
        expirationDate: data.expirationDate,
        amount: data.amount,
        moduleName: data.moduleName,
      });
    }
    setPixLoading(false);
  };

  const handleCopyPayload = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      toast.success("Código PIX copiado!");
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await Promise.all([refreshPayments(), refreshModules()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (pixData && hasModule(pixData.moduleName as ModuleName)) {
      const mod = catalog.find((m) => m.module_name === pixData.moduleName);
      toast.success(`Módulo "${mod?.display_name || pixData.moduleName}" ativado com sucesso!`);
      setPixData(null);
      setPixModuleName(null);
    }
  }, [pixData, hasModule, catalog]);

  const pixModuleCatalog = pixData ? catalog.find((m) => m.module_name === pixData.moduleName) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Módulos</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10 space-y-4">
        <GracePeriodBanner />

        {/* Trial info banner */}
        {isTrialActive && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
            <Unlock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Todos os módulos estão liberados durante o teste gratuito
              </p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Restam <strong>{trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""}</strong> de teste. Selecione os módulos que deseja manter após o período de teste.
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {isTrialActive
            ? "Todos os módulos estão liberados. Selecione os que deseja incluir na sua assinatura futura."
            : isPreSubscription
            ? "Monte seu plano ideal. Selecione os módulos que deseja incluir na sua assinatura."
            : "Amplie seu app com funcionalidades extras. Ative apenas o que precisar."}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catalog.map((mod) => {
                const status = getModuleStatus(mod);
                const Icon = ICON_MAP[mod.module_name] || Puzzle;
                const isTogglingThis = toggling === mod.module_name;
                const isLoadingThis = pixLoading && pixModuleName === mod.module_name;
                const isTrialUnlocked = status === "trial_unlocked";
                const isModuleSelected = status === "selected";

                const borderClass =
                  status === "manual"
                    ? "border-purple-500/30 bg-purple-500/5"
                    : status === "active"
                    ? "border-primary/40 bg-primary/5"
                    : isModuleSelected
                    ? "border-primary/40 bg-primary/10"
                    : isTrialUnlocked
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : status === "pending"
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : status === "rejected"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border bg-card hover:border-primary/20";

                return (
                  <div key={mod.module_name} className={`rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${borderClass}`}>
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        status === "manual" ? "bg-purple-500/15" : status === "active" || isModuleSelected ? "bg-primary/20" : isTrialUnlocked ? "bg-emerald-500/15" : status === "pending" ? "bg-yellow-500/15" : status === "rejected" ? "bg-red-500/15" : "bg-secondary"
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          status === "manual" ? "text-purple-500" : status === "active" || isModuleSelected ? "text-primary" : isTrialUnlocked ? "text-emerald-500" : status === "pending" ? "text-yellow-500" : status === "rejected" ? "text-red-500" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{mod.display_name}</h3>
                          {(status === "active" || status === "manual") && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                          {status === "pending" && <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                          {status === "rejected" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                      </div>
                    </div>

                    {/* Manual label */}
                    {status === "manual" && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-purple-400" />
                        <span className="text-xs font-medium text-purple-400">Liberado</span>
                      </div>
                    )}

                    {/* Trial unlocked label */}
                    {(isTrialUnlocked || (isTrialActive && isModuleSelected)) && (
                      <div className="flex items-center gap-1.5">
                        <Unlock className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-500">Incluído no teste</span>
                      </div>
                    )}

                    {/* Footer: price + action */}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(mod.price, mod.billing_period)}
                      </span>

                      {status === "manual" ? (
                        <Button size="sm" variant="secondary" disabled className="rounded-xl gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Liberado
                        </Button>
                      ) : status === "active" ? (
                        <Button size="sm" variant="secondary" disabled className="rounded-xl gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                        </Button>
                      ) : (isTrialActive || isPreSubscription) && (isTrialUnlocked || isModuleSelected) ? (
                        /* Toggle for trial / pre-subscription */
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {isModuleSelected ? "No plano" : "Adicionar"}
                          </span>
                          <Switch
                            checked={isModuleSelected}
                            disabled={isTogglingThis}
                            onCheckedChange={() => handleToggleTrialModule(mod)}
                          />
                        </div>
                      ) : isPreSubscription && status === "available" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Adicionar</span>
                          <Switch
                            checked={false}
                            disabled={isTogglingThis}
                            onCheckedChange={() => handleToggleTrialModule(mod)}
                          />
                        </div>
                      ) : status === "pending" ? (
                        <Button size="sm" variant="outline" disabled className="rounded-xl gap-1.5 text-xs border-yellow-500/30 text-yellow-500">
                          <Clock className="h-3.5 w-3.5" /> Aguardando
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="rounded-xl gap-1.5 text-xs"
                          onClick={() => handleContractModule(mod)}
                          disabled={isLoadingThis}
                        >
                          {isLoadingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {status === "rejected" ? "Reenviar" : "Contratar"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subscription summary */}
            {isPreSubscription && <SubscriptionSummaryCard />}
          </>
        )}
      </div>

      {/* PIX Payment Dialog */}
      <Dialog open={!!pixData} onOpenChange={(o) => { if (!o) { setPixData(null); setPixModuleName(null); } }}>
        <DialogContent className="max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Pagamento PIX — {pixModuleCatalog?.display_name}</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código para pagar.
            </DialogDescription>
          </DialogHeader>

          {pixData && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {pixData.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>

              {pixData.qrCodeImage && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeImage}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {pixData.payload && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Copia e cola:</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-[10px] bg-secondary/50 p-2 rounded-lg break-all max-h-16 overflow-y-auto border border-border">
                      {pixData.payload}
                    </code>
                    <Button size="icon" variant="outline" className="shrink-0 rounded-xl" onClick={handleCopyPayload}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                Após o pagamento, o módulo será ativado automaticamente.
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl"
                onClick={handleRefreshStatus}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Já paguei — verificar ativação
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPixData(null); setPixModuleName(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
