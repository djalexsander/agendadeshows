import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Sparkles, AlertTriangle, X, Puzzle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function TrialBanner() {
  const { isTrialActive, trialDaysLeft, isTrialWarning, isGracePeriod, graceDaysLeft } = useTrialStatus();
  const [dismissed, setDismissed] = useState(false);
  const [graceDismissed, setGraceDismissed] = useState(false);
  const navigate = useNavigate();

  // Grace period banner (post-trial)
  if (isGracePeriod && !graceDismissed) {
    return (
      <div className="relative px-4 py-2.5 text-center text-sm font-medium bg-yellow-500/15 text-yellow-400 border-b border-yellow-500/20">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Puzzle className="h-4 w-4 shrink-0" />
          <span>
            Seu teste terminou. Você tem {graceDaysLeft} dia{graceDaysLeft !== 1 ? "s" : ""} para ativar seus módulos.
          </span>
          <button
            onClick={() => navigate("/modulos")}
            className="underline font-semibold hover:text-yellow-300 transition-colors"
          >
            Ativar módulos
          </button>
        </div>
        <button
          onClick={() => setGraceDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Trial active banner
  if (!isTrialActive || dismissed) return null;

  return (
    <div className={`relative px-4 py-2.5 text-center text-sm font-medium ${
      isTrialWarning
        ? "bg-yellow-500/15 text-yellow-400 border-b border-yellow-500/20"
        : "bg-primary/10 text-primary border-b border-primary/20"
    }`}>
      <div className="flex items-center justify-center gap-2">
        {isTrialWarning ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0" />
        )}
        <span>
          {isTrialWarning
            ? `Seu teste gratuito termina em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""}! Ative seus módulos para continuar usando.`
            : `Teste gratuito ativo — acesso total aos módulos por ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""}.`
          }
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
