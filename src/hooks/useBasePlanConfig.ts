import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BasePlanConfig {
  id: string;
  name: string;
  price: number;
  billing_period: string;
  active: boolean;
}

export function useBasePlanConfig() {
  const [config, setConfig] = useState<BasePlanConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("base_plan_config") as any)
      .select("*")
      .eq("active", true)
      .limit(1)
      .single();
    setConfig(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = async (updates: Partial<Omit<BasePlanConfig, "id">>) => {
    if (!config) return;
    await (supabase.from("base_plan_config") as any)
      .update(updates)
      .eq("id", config.id);
    await fetchConfig();
  };

  return { config, loading, refreshConfig: fetchConfig, updateConfig };
}
