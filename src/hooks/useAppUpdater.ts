import { useCallback, useEffect, useState } from "react";

/**
 * Hook para atualização automática via Tauri v2 updater.
 * Usa import dinâmico — no navegador web os imports nunca são executados.
 *
 * Para empacotar com Tauri, instale localmente:
 *   npm i @tauri-apps/api @tauri-apps/plugin-updater @tauri-apps/plugin-process
 * E configure plugins/endpoints/pubkey em src-tauri/tauri.conf.json.
 */

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

export interface UpdateInfo {
  version: string;
  currentVersion?: string;
  date?: string;
  body?: string;
}

export interface UseAppUpdaterReturn {
  isDesktop: boolean;
  phase: UpdaterPhase;
  update: UpdateInfo | null;
  progress: number; // 0..100
  error: string | null;
  check: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismiss: () => void;
}

function detectDesktop(): boolean {
  if (typeof window === "undefined") return false;
  // Tauri v2 expõe __TAURI_INTERNALS__; v1 expunha __TAURI__. Cobrimos ambos.
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

interface TauriUpdateResult {
  version: string;
  currentVersion?: string;
  date?: string;
  body?: string;
  downloadAndInstall: (
    cb: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void,
  ) => Promise<void>;
}

export function useAppUpdater(autoCheck = true): UseAppUpdaterReturn {
  const [isDesktop] = useState<boolean>(detectDesktop);
  const [phase, setPhase] = useState<UpdaterPhase>("idle");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const check = useCallback(async () => {
    if (!isDesktop) return;
    setError(null);
    setPhase("checking");
    try {
      // Specifier ofuscado para o Rollup não tentar resolver em build-time.
      // O pacote só existe quando o app é empacotado com Tauri.
      const mod = await import(
        /* @vite-ignore */ ["@tauri-apps", "plugin-updater"].join("/")
      );
      const tauriCheck = (mod as { check: () => Promise<TauriUpdateResult | null> }).check;
      const result = await tauriCheck();
      if (result) {
        setUpdate({
          version: result.version,
          currentVersion: result.currentVersion,
          date: result.date,
          body: result.body,
        });
        // Guardamos a instância para reuso no download.
        (window as unknown as { __pendingUpdate?: unknown }).__pendingUpdate = result;
        setPhase("available");
      } else {
        setUpdate(null);
        setPhase("up-to-date");
      }
    } catch (e) {
      console.error("[updater] check failed", e);
      setError(e instanceof Error ? e.message : "Falha ao verificar atualizações");
      setPhase("error");
    }
  }, [isDesktop]);

  const downloadAndInstall = useCallback(async () => {
    if (!isDesktop) return;
    const pending = (window as unknown as { __pendingUpdate?: {
      downloadAndInstall: (cb: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void) => Promise<void>;
    } }).__pendingUpdate;
    if (!pending) {
      await check();
      return;
    }
    setError(null);
    setProgress(0);
    setPhase("downloading");
    try {
      let downloaded = 0;
      let contentLength = 0;
      await pending.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data?.contentLength ?? 0;
          setProgress(0);
        } else if (event.event === "Progress") {
          downloaded += event.data?.chunkLength ?? 0;
          if (contentLength > 0) {
            setProgress(Math.min(100, Math.round((downloaded / contentLength) * 100)));
          }
        } else if (event.event === "Finished") {
          setProgress(100);
          setPhase("installing");
        }
      });
      setPhase("ready");
      // Reinicia o app para aplicar a atualização.
      try {
        const proc = await import(
          /* @vite-ignore */ ["@tauri-apps", "plugin-process"].join("/")
        );
        await (proc as { relaunch: () => Promise<void> }).relaunch();
      } catch (e) {
        console.warn("[updater] relaunch failed; user must restart manually", e);
      }
        console.warn("[updater] relaunch failed; user must restart manually", e);
      }
    } catch (e) {
      console.error("[updater] install failed", e);
      setError(e instanceof Error ? e.message : "Falha ao baixar/instalar atualização");
      setPhase("error");
    }
  }, [isDesktop, check]);

  const dismiss = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    if (autoCheck && isDesktop) {
      check();
    }
  }, [autoCheck, isDesktop, check]);

  return {
    isDesktop,
    phase: dismissed && phase === "available" ? "idle" : phase,
    update,
    progress,
    error,
    check,
    downloadAndInstall,
    dismiss,
  };
}
