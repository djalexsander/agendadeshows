import { useState } from "react";
import {
  Puzzle, DollarSign, Users, FileBarChart, ImageDown, MapPinned, ArrowLeft,
  CheckCircle2, Sparkles, Clock, Loader2, XCircle, Upload, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useModules, type ModuleName } from "@/hooks/useModules";
import { useModuleRequests } from "@/hooks/useModuleRequests";
import { useModuleCatalog, type CatalogModule } from "@/hooks/useModuleCatalog";
import { useClientModulePayments } from "@/hooks/useClientModulePayments";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ElementType> = {
  financeiro: DollarSign,
  equipe: Users,
  relatorios: FileBarChart,
  export_png: ImageDown,
  gps: MapPinned,
};

function formatPrice(price: number, billingPeriod: string) {
  const formatted = price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return billingPeriod === "monthly" ? `${formatted}/mês` : `${formatted} único`;
}

export default function ModulesUpgrade() {
  const { user, profile } = useAuth();
  const { hasModule, loading: modulesLoading } = useModules();
  const { hasPendingRequest, loading: requestsLoading } = useModuleRequests();
  const { modules: catalog, loading: catalogLoading } = useModuleCatalog();
  const { hasPendingPayment, getLatestPayment, createModulePayment, loading: paymentsLoading } = useClientModulePayments();
  const navigate = useNavigate();

  const [selectedModule, setSelectedModule] = useState<CatalogModule | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const loading = modulesLoading || requestsLoading || catalogLoading || paymentsLoading;

  const getModuleStatus = (mod: CatalogModule): "active" | "pending" | "rejected" | "available" => {
    if (hasModule(mod.module_name as ModuleName)) return "active";
    if (hasPendingPayment(mod.module_name) || hasPendingRequest(mod.module_name as ModuleName)) return "pending";
    const latest = getLatestPayment(mod.module_name);
    if (latest && latest.status === "rejected") return "rejected";
    return "available";
  };

  const handleSubmit = async () => {
    if (!selectedModule || !user) return;
    setUploading(true);

    let receiptUrl: string | undefined;
    if (file) {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/mod_${selectedModule.module_name}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("comprovantes").upload(filePath, file);
      if (uploadError) {
        toast.error("Falha ao enviar arquivo.");
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("comprovantes").getPublicUrl(filePath);
      receiptUrl = urlData.publicUrl;
    }

    const result = await createModulePayment(selectedModule.module_name, selectedModule.price, { receiptUrl, notes: notes || undefined });

    if (result.error === "duplicate") {
      toast.warning("Você já possui um pagamento pendente para este módulo.");
    } else if (result.error) {
      toast.error("Erro ao enviar pagamento.");
    } else {
      toast.success(`Pagamento de "${selectedModule.display_name}" enviado para análise!`);
      supabase.functions.invoke("send-push", {
        body: {
          title: "💳 Pagamento de módulo",
          body: `${profile?.nome || "Um cliente"} enviou pagamento do módulo "${selectedModule.display_name}".`,
          url: "/admin/module-payments",
          target_role: "admin",
        },
      }).catch(() => {});
    }

    setSelectedModule(null);
    setFile(null);
    setNotes("");
    setUploading(false);
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
            {catalog.map((mod) => {
              const status = getModuleStatus(mod);
              const Icon = ICON_MAP[mod.module_name] || Puzzle;

              return (
                <div
                  key={mod.module_name}
                  className={`rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                    status === "active"
                      ? "border-primary/40 bg-primary/5"
                      : status === "pending"
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : status === "rejected"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      status === "active" ? "bg-primary/20" : status === "pending" ? "bg-yellow-500/15" : status === "rejected" ? "bg-red-500/15" : "bg-secondary"
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        status === "active" ? "text-primary" : status === "pending" ? "text-yellow-500" : status === "rejected" ? "text-red-500" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{mod.display_name}</h3>
                        {status === "active" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
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
                    ) : status === "pending" ? (
                      <Button size="sm" variant="outline" disabled className="rounded-xl gap-1.5 text-xs border-yellow-500/30 text-yellow-500">
                        <Clock className="h-3.5 w-3.5" /> Em análise
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        className="rounded-xl gap-1.5 text-xs"
                        onClick={() => setSelectedModule(mod)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {status === "rejected" ? "Reenviar" : "Solicitar ativação"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment dialog */}
      <Dialog open={!!selectedModule} onOpenChange={(o) => { if (!o) { setSelectedModule(null); setFile(null); setNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar {selectedModule?.display_name}</DialogTitle>
            <DialogDescription>
              Envie o comprovante de pagamento para ativar o módulo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-secondary/50 p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="text-lg font-bold text-primary">
                {selectedModule && formatPrice(selectedModule.price, selectedModule.billing_period)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label>Comprovante (imagem/PDF)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-10 bg-secondary/50 border-border file:text-primary file:font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Paguei via Nubank"
                className="bg-secondary/50 border-border resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSelectedModule(null)} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Enviar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
