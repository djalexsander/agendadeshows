import { Download, RefreshCw, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppUpdater } from "@/hooks/useAppUpdater";

/**
 * Banner de atualização do app.
 * Aparece sempre que `/version.json` indica uma versão maior que `APP_VERSION` do bundle atual.
 * Funciona em PWA instalado, navegador comum, WebView mobile e wrappers desktop.
 */
export function UpdateBanner() {
  const { phase, update, progress, error, downloadAndInstall, dismiss } = useAppUpdater(true);

  if (phase === "idle" || phase === "checking" || phase === "up-to-date") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[min(92vw,380px)] animate-in fade-in slide-in-from-bottom-4">
      <Card className="border-primary/30 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-4">
          {phase === "available" && update && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Nova versão disponível</p>
                    <p className="text-xs text-muted-foreground">
                      v{update.version}
                      {update.currentVersion ? ` • atual v${update.currentVersion}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="rounded p-1 opacity-60 hover:opacity-100"
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {update.notes && (
                <p className="line-clamp-3 text-xs text-muted-foreground">{update.notes}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={downloadAndInstall}>
                  Atualizar agora
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Depois
                </Button>
              </div>
            </div>
          )}

          {phase === "downloading" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Baixando atualização…</p>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          {phase === "ready" && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm">Atualização instalada. Reiniciando…</p>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Não foi possível atualizar</p>
                  <p className="text-xs text-muted-foreground">
                    {error ?? "Tente novamente em alguns instantes."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={downloadAndInstall}>
                  Tentar novamente
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
