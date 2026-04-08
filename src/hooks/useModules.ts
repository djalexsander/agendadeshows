import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ModuleName = "financeiro" | "equipe" | "relatorios" | "export_png" | "gps" | "agenda_compartilhada";

const ALL_MODULE_NAMES: ModuleName[] = ["financeiro", "equipe", "relatorios", "export_png", "gps", "agenda_compartilhada"];

interface UserModule {
  id: string;
  module_name: string;
  active: boolean;
}

export function useModules() {
  const { user, role } = useAuth();
  const [modules, setModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin";

  const fetchModules = useCallback(async () => {
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    // Admin always has all modules
    if (isAdmin) {
      setModules(ALL_MODULE_NAMES.map((name) => ({ id: name, module_name: name, active: true })));
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("user_modules")
      .select("id, module_name, active")
      .eq("user_id", user.id)
      .eq("active", true);

    setModules(data ?? []);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const hasModule = useCallback(
    (name: ModuleName) => {
      if (isAdmin) return true;
      return modules.some((m) => m.module_name === name);
    },
    [modules, isAdmin]
  );

  return { modules, loading, hasModule, refreshModules: fetchModules };
}
