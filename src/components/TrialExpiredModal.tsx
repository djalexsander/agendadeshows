import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useModules } from "@/hooks/useModules";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Puzzle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function TrialExpiredModal() {
  const { isTrialExpired, hadTrial } = useTrialStatus();
  const { modules } = useModules();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show modal only once per session for clients whose trial expired and have no paid modules
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
            Você aproveitou 7 dias de acesso total. Para continuar usando os módulos, ative-os no seu plano.
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full rounded-xl gap-2" onClick={() => { setOpen(false); navigate("/modulos"); }}>
          <Lock className="h-4 w-4" />
          Ver módulos disponíveis
        </Button>
      </DialogContent>
    </Dialog>
  );
}
