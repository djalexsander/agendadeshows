import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        if (data.valid) { setStatus("valid"); return; }
        setStatus("invalid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      setStatus(error ? "error" : "done");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-card border border-border p-8 text-center space-y-4">
        {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}

        {status === "valid" && (
          <>
            <MailX className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Cancelar inscrição</h1>
            <p className="text-sm text-muted-foreground">Deseja parar de receber e-mails do Minha Agenda?</p>
            <Button className="w-full" onClick={handleUnsubscribe} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar cancelamento
            </Button>
          </>
        )}

        {status === "done" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Inscrição cancelada</h1>
            <p className="text-sm text-muted-foreground">Você não receberá mais e-mails.</p>
          </>
        )}

        {status === "already" && (
          <>
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Já cancelado</h1>
            <p className="text-sm text-muted-foreground">Sua inscrição já foi cancelada anteriormente.</p>
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
            <p className="text-sm text-muted-foreground">Este link é inválido ou expirou.</p>
          </>
        )}
      </div>
    </div>
  );
}
