import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/lib/version";

/**
 * Hook de auto-update para o app instalado (PWA / WebView / desktop wrapper).
 *
 * Como funciona:
 *  - A cada X minutos faz fetch em `/version.json` (sem cache).
 *  - Se a versão remota for MAIOR que `APP_VERSION` do bundle atual, marca como "available".
 *  - Botão "Atualizar agora" força o Service Worker a buscar a nova versão e recarrega a página,
 *    o que faz o navegador/WebView baixar o novo bundle JS.
 *
 * Para liberar uma atualização:
 *  1. Atualize `src/lib/version.ts`  -> APP_VERSION = "v1.0.4"
 *  2. Atualize `public/version.json` -> { "version": "1.0.4", ... }
 *  3. Publique. Em até ~1 min todos os apps abertos verão o banner.
 */

const VERSION_URL = "/version.json";
const POLL_INTERVAL_MS = 60_000; // 1 minuto
const DISMISS_KEY = "update_dismissed_version";

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "ready"
  | "error";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  notes?: string;
  releasedAt?: string;
}

export interface UseAppUpdaterReturn {
  isDesktop: boolean;
  phase: UpdaterPhase;
  update: UpdateInfo | null;
  progress: number;
  error: string | null;
  check: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismiss: () => void;
}

function stripV(v: string): string {
  return v.replace(/^v/i, "").trim();
}

/** Compara "1.2.3" vs "1.2.4". Retorna >0 se a > b, <0 se a < b, 0 se iguais. */
function compareVersions(a: string, b: string): number {
  const pa = stripV(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = stripV(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/**
 * Banner é "para apps". Considera como app:
 *  - PWA instalado (display-mode: standalone)
 *  - iOS standalone
 *  - Wrappers desktop (Tauri, Electron)
 *  - Em dev/preview também aparece se houver versão maior, para facilitar QA.
 */
function detectInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (w.__TAURI_INTERNALS__ || w.__TAURI__) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  }
  // Electron user agent
  if (/Electron/i.test(navigator.userAgent)) return true;
  return false;
}

export function useAppUpdater(autoCheck = true): UseAppUpdaterReturn {
  const [isDesktop] = useState<boolean>(detectInstalledApp);
  const [phase, setPhase] = useState<UpdaterPhase>("idle");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });
  const pollRef = useRef<number | null>(null);

  const check = useCallback(async () => {
    setError(null);
    setPhase("checking");
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { version?: string; notes?: string; releasedAt?: string };
      if (!data?.version) throw new Error("version.json inválido");

      const remote = stripV(data.version);
      const local = stripV(APP_VERSION);
      if (compareVersions(remote, local) > 0) {
        setUpdate({
          version: remote,
          currentVersion: local,
          notes: data.notes,
          releasedAt: data.releasedAt,
        });
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
  }, []);

  const downloadAndInstall = useCallback(async () => {
    setError(null);
    setProgress(10);
    setPhase("downloading");
    try {
      // Atualiza o Service Worker para puxar o bundle novo no próximo load.
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          try {
            await reg.update();
          } catch {
            /* sem SW novo, segue */
          }
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      }
      setProgress(70);

      // Limpa caches do navegador para forçar reload do bundle.
      if ("caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
          /* ignore */
        }
      }
      setProgress(95);

      // Limpa flag de dismiss para esta versão.
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
      setPhase("ready");

      // Reload — o navegador/WebView baixa o novo index.html + bundles.
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (e) {
      console.error("[updater] install failed", e);
      setError(e instanceof Error ? e.message : "Falha ao atualizar");
      setPhase("error");
    }
  }, []);

  const dismiss = useCallback(() => {
    if (update?.version) {
      try {
        localStorage.setItem(DISMISS_KEY, update.version);
      } catch {
        /* ignore */
      }
      setDismissedVersion(update.version);
    }
  }, [update]);

  useEffect(() => {
    if (!autoCheck) return;
    check();
    pollRef.current = window.setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [autoCheck, check]);

  // Se o usuário dispensou esta versão, esconde o banner até sair uma nova maior.
  const effectivePhase: UpdaterPhase =
    phase === "available" && update && dismissedVersion === update.version ? "idle" : phase;

  return {
    isDesktop,
    phase: effectivePhase,
    update,
    progress,
    error,
    check,
    downloadAndInstall,
    dismiss,
  };
}
