import { useState, useEffect, useRef } from "react";
import {
  Puzzle, DollarSign, Users, UsersRound, FileBarChart, ImageDown, MapPinned, ArrowLeft,
  CheckCircle2, Sparkles, Clock, Loader2, XCircle, Plus, Minus, Copy, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useModules, type ModuleName } from "@/hooks/useModules";
import { useModuleRequests } from "@/hooks/useModuleRequests";
import { useModuleCatalog, type CatalogModule } from "@/hooks/useModuleCatalog";
import { useClientModulePayments } from "@/hooks/useClientModulePayments";
import { useTrialModuleSelections } from "@/hooks/useTrialModuleSelections";
import { useAuth } from "@/hooks/useAuth";
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

interface PixPaymentData {
  paymentId: string;
  payload: string;
  qrCodeImage: string;
  expirationDate: string;
  amount: number;
  moduleName: string;
}

export default function ModulesUpgrade() {
  const { user, profile } = useAuth();
  const { hasModule, loading: modulesLoading, refreshModules } = useModules();
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

  const getModuleStatus = (mod: CatalogModule): "active" | "pending" | "rejected" | "selected" | "available" => {
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
    // The useEffect below will detect activation and close the dialog
  };

  // Auto-detect module activation after refresh
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
        <p className="text-sm text-muted-foreground">
          {isPreSubscription
            ? "Monte seu plano ideal. Selecione os módulos que deseja incluir na sua assinatura."
            : "Amplie seu app com funcionalidades extras. Ative apenas o que precisar."}
        </p>

        {isPreSubscription && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            Os módulos selecionados serão somados ao plano base na sua assinatura.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {catalog.map((mod) => {
              const status = getModuleStatus(mod);
              const Icon = ICON_MAP[mod.module_name] || Puzzle;
              const isTogglingThis = toggling === mod.module_name;
              const isLoadingThis = pixLoading && pixModuleName === mod.module_name;

              return (
                <div
                  key={mod.module_name}
                  className={`rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                    status === "active"
                      ? "border-primary/40 bg-primary/5"
                      : status === "selected"
                      ? "border-primary/40 bg-primary/10"
                      : status === "pending"
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : status === "rejected"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      status === "active" || status === "selected" ? "bg-primary/20" : status === "pending" ? "bg-yellow-500/15" : status === "rejected" ? "bg-red-500/15" : "bg-secondary"
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        status === "active" || status === "selected" ? "text-primary" : status === "pending" ? "text-yellow-500" : status === "rejected" ? "text-red-500" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{mod.display_name}</h3>
                        {status === "active" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        {status === "selected" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        {status === "pending" && <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                        {status === "rejected" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-bold text-foreground">
                      {formatPrice(mod.price, mod.billing_period)}
                    </span>

                    {status === "active" ? (
                      <Button size="sm" variant="secondary" disabled className="rounded-xl gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                      </Button>
                    ) : status === "selected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-1.5 text-xs border-primary/30 text-primary"
                        onClick={() => handleToggleTrialModule(mod)}
                        disabled={isTogglingThis}
                      >
                        {isTogglingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Minus className="h-3.5 w-3.5" />}
                        Selecionado
                      </Button>
                    ) : status === "pending" ? (
                      <Button size="sm" variant="outline" disabled className="rounded-xl gap-1.5 text-xs border-yellow-500/30 text-yellow-500">
                        <Clock className="h-3.5 w-3.5" /> Aguardando
                      </Button>
                    ) : isPreSubscription ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="rounded-xl gap-1.5 text-xs"
                        onClick={() => handleToggleTrialModule(mod)}
                        disabled={isTogglingThis}
                      >
                        {isTogglingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Adicionar ao plano
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
