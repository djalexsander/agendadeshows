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

  const createModule = async (newModule: { module_name: string; display_name: string; description?: string; price: number; billing_period: string; sort_order: number }) => {
    const { error } = await supabase
      .from("module_catalog")
      .insert({
        module_name: newModule.module_name,
        display_name: newModule.display_name,
        description: newModule.description || null,
        price: newModule.price,
        billing_period: newModule.billing_period,
        sort_order: newModule.sort_order,
        active: true,
      });
    if (!error) await fetchModules();
    return { error };
  };

  const deleteModule = async (id: string) => {
    const { error } = await supabase
      .from("module_catalog")
      .delete()
      .eq("id", id);
    if (!error) await fetchModules();
    return { error };
  };

  const toggleModuleActive = async (id: string, active: boolean) => {
    return updateModule(id, { active });
  };

  return { modules, loading, refreshModules: fetchModules, updateModule, createModule, deleteModule, toggleModuleActive };
}
