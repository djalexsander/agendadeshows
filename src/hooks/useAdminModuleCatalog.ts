import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogModule } from "./useModuleCatalog";

export function useAdminModuleCatalog() {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_catalog")
      .select("*")
      .order("sort_order", { ascending: true });
    setModules((data as CatalogModule[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const updateModule = async (id: string, updates: Partial<Omit<CatalogModule, "id" | "module_name">>) => {
    const { error } = await supabase
      .from("module_catalog")
      .update(updates)
      .eq("id", id);
    if (!error) await fetchModules();
    return { error };
  };

  const toggleModuleActive = async (id: string, active: boolean) => {
    return updateModule(id, { active });
  };

  return { modules, loading, refreshModules: fetchModules, updateModule, toggleModuleActive };
}
