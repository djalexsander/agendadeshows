import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ModuleName = "financeiro" | "equipe" | "relatorios" | "export_png" | "gps";

interface UserModule {
  id: string;
  module_name: string;
  active: boolean;
}

export function useModules() {
  const { user } = useAuth();
  const [modules, setModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    if (!user) {
      setModules([]);
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
  }, [user]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const hasModule = useCallback(
    (name: ModuleName) => modules.some((m) => m.module_name === name),
    [modules]
  );

  return { modules, loading, hasModule, refreshModules: fetchModules };
}
