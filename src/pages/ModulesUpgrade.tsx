import { useState } from "react";
import { Puzzle, DollarSign, Users, FileBarChart, ImageDown, MapPinned, ArrowLeft, CheckCircle2, Sparkles, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModules, type ModuleName } from "@/hooks/useModules";
import { useModuleRequests } from "@/hooks/useModuleRequests";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ModuleInfo {
  key: ModuleName;
  label: string;
  description: string;
  price: string;
  icon: React.ElementType;
}

const MODULES: ModuleInfo[] = [
  {
    key: "financeiro",
    label: "Financeiro",
    description: "Controle financeiro e acompanhamento de valores",
    price: "R$ 15/mês",
    icon: DollarSign,
  },
  {
    key: "equipe",
    label: "Equipe",
    description: "Gestão de equipe e usuários da operação",
    price: "R$ 15/mês",
    icon: Users,
  },
  {
    key: "relatorios",
    label: "Relatórios",
    description: "Visão resumida e indicadores do sistema",
    price: "R$ 10/mês",
    icon: FileBarChart,
  },
  {
    key: "export_png",
    label: "Exportação PNG",
    description: "Exportação visual profissional dos eventos",
    price: "R$ 5/mês",
    icon: ImageDown,
  },
  {
    key: "gps",
    label: "Rotas / GPS",
    description: "Atalhos para navegação e rota dos eventos",
    price: "R$ 5/mês",
    icon: MapPinned,
  },
];

export default function ModulesUpgrade() {
  const { hasModule, loading: modulesLoading } = useModules();
  const { hasPendingRequest, createRequest, loading: requestsLoading } = useModuleRequests();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState<string | null>(null);

  const loading = modulesLoading || requestsLoading;

  const handleRequest = async (mod: ModuleInfo) => {
    setRequesting(mod.key);
    const result = await createRequest(mod.key);
    setRequesting(null);

    if (result.error === "duplicate") {
      toast.warning(`Você já possui uma solicitação pendente para "${mod.label}".`);
    } else if (result.error) {
      toast.error(`Erro ao solicitar "${mod.label}". Tente novamente.`);
    } else {
      toast.success(`Solicitação de "${mod.label}" enviada com sucesso! Aguarde a análise.`);
    }
  };

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
          Amplie seu app com funcionalidades extras. Ative apenas o que precisar.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODULES.map((mod) => {
              const active = hasModule(mod.key);
              const pending = hasPendingRequest(mod.key);
              const isRequesting = requesting === mod.key;
              const Icon = mod.icon;

              return (
                <div
                  key={mod.key}
                  className={`rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/5"
                      : pending
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      active
                        ? "bg-primary/20"
                        : pending
                        ? "bg-yellow-500/15"
                        : "bg-secondary"
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        active
                          ? "text-primary"
                          : pending
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{mod.label}</h3>
                        {active && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        {pending && <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-bold text-foreground">{mod.price}</span>
                    {active ? (
                      <Button size="sm" variant="secondary" disabled className="rounded-xl gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                      </Button>
                    ) : pending ? (
                      <Button size="sm" variant="outline" disabled className="rounded-xl gap-1.5 text-xs border-yellow-500/30 text-yellow-500">
                        <Clock className="h-3.5 w-3.5" /> Em análise
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        className="rounded-xl gap-1.5 text-xs"
                        disabled={isRequesting}
                        onClick={() => handleRequest(mod)}
                      >
                        {isRequesting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {isRequesting ? "Enviando..." : "Solicitar ativação"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
