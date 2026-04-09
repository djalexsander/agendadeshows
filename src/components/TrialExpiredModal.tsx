import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useModules } from "@/hooks/useModules";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Puzzle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function TrialExpiredModal() {
  const { isTrialExpired, isGracePeriod, graceDaysLeft, hadTrial } = useTrialStatus();
  const { modules } = useModules();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (role !== "client" || !hadTrial || !isTrialExpired) return;
    const hasPaidModules = modules.some((m) => m.active);
    if (hasPaidModules) return;

    const key = "trial_expired_modal_shown";
    if (!sessionStorage.getItem(key)) {
      setOpen(true);
      sessionStorage.setItem(key, "1");
    }
  }, [isTrialExpired, hadTrial, modules, role]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Puzzle className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Seu teste gratuito terminou</DialogTitle>
          <DialogDescription className="text-center">
            {isGracePeriod
              ? `Você ainda tem ${graceDaysLeft} dia${graceDaysLeft !== 1 ? "s" : ""} para ativar seus módulos com condições especiais. Seu plano básico continua ativo.`
              : "Seu plano foi convertido para o básico. Ative módulos adicionais para desbloquear mais funcionalidades."
            }
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full rounded-xl gap-2" onClick={() => { setOpen(false); navigate("/modulos"); }}>
          <Sparkles className="h-4 w-4" />
          Ativar módulos
        </Button>
        <Button variant="ghost" className="w-full rounded-xl" onClick={() => setOpen(false)}>
          Continuar com plano básico
        </Button>
      </DialogContent>
    </Dialog>
  );
}
