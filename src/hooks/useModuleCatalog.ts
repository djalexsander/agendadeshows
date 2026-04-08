import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogModule {
  id: string;
  module_name: string;
  display_name: string;
  description: string | null;
  price: number;
  billing_period: string;
  active: boolean;
  sort_order: number;
}

export function useModuleCatalog() {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_catalog")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    setModules((data as CatalogModule[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return { modules, loading, refreshModules: fetchModules };
}
