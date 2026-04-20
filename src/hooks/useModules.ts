import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export type ModuleName = "financeiro" | "equipe" | "relatorios" | "export_png" | "gps" | "agenda_compartilhada";

// NOTE: "equipe" existe no catálogo do banco (module_catalog) mas ainda não foi
// lançado como feature ativa no app. Mantemos o tipo e os labels para que o
// admin consiga visualizar/gerenciar pagamentos e requests existentes, porém
// ele NÃO é incluído em ALL_MODULE_NAMES (não é liberado durante trial nem
// considerado um módulo ativo no fluxo do cliente).
const ALL_MODULE_NAMES: ModuleName[] = ["financeiro", "relatorios", "export_png", "gps", "agenda_compartilhada"];

interface UserModule {
  id: string;
  module_name: string;
  active: boolean;
}

interface ModuleAccess {
  module_name: string;
  origin: "manual" | "payment" | "trial" | "none";
}

export function useModules() {
  const { user, role } = useAuth();
  const { isTrialActive } = useTrialStatus();
  const [modules, setModules] = useState<UserModule[]>([]);
  const [manualModules, setManualModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin";

  const fetchModules = useCallback(async () => {
    if (!user) {
      setModules([]);
      setManualModules([]);
      setLoading(false);
      return;
    }

    // Admin: all modules
    if (isAdmin) {
      setModules(ALL_MODULE_NAMES.map((name) => ({ id: name, module_name: name, active: true })));
      setManualModules([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch paid modules and manual overrides in parallel
    const [paidRes, manualRes] = await Promise.all([
      supabase
        .from("user_modules")
        .select("id, module_name, active")
        .eq("user_id", user.id)
        .eq("active", true),
      (supabase.from("manual_module_overrides") as any)
        .select("module_name")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    const paidModules = paidRes.data ?? [];
    const manualMods: string[] = (manualRes.data ?? []).map((m: any) => m.module_name);
    setManualModules(manualMods);

    // During trial: all modules active
    if (isTrialActive) {
      setModules(ALL_MODULE_NAMES.map((name) => ({ id: name, module_name: name, active: true })));
    } else {
      // Merge paid + manual (deduplicated)
      const activeNames = new Set<string>();
      paidModules.forEach((m) => activeNames.add(m.module_name));
      manualMods.forEach((name) => activeNames.add(name));

      const merged: UserModule[] = Array.from(activeNames).map((name) => ({
        id: name,
        module_name: name,
        active: true,
      }));
      setModules(merged);
    }

    setLoading(false);
  }, [user, isAdmin, isTrialActive]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const hasModule = useCallback(
    (name: ModuleName) => {
      if (isAdmin || isTrialActive) return true;
      return modules.some((m) => m.module_name === name);
    },
    [modules, isAdmin, isTrialActive]
  );

  /**
   * Returns the origin of access for a given module.
   * Priority: manual > payment > trial > none
   */
  const getModuleOrigin = useCallback(
    (name: string): "manual" | "payment" | "trial" | "none" => {
      if (manualModules.includes(name)) return "manual";
      if (modules.some((m) => m.module_name === name && !manualModules.includes(name))) return isTrialActive ? "trial" : "payment";
      if (isTrialActive) return "trial";
      return "none";
    },
    [modules, manualModules, isTrialActive]
  );

  return { modules, loading, hasModule, getModuleOrigin, refreshModules: fetchModules };
}
