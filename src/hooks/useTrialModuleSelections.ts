import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TrialModuleSelection {
  id: string;
  user_id: string;
  module_name: string;
  created_at: string;
}

export function useTrialModuleSelections() {
  const { user } = useAuth();
  const [selections, setSelections] = useState<TrialModuleSelection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSelections = useCallback(async () => {
    if (!user) {
      setSelections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase.from("trial_module_selections") as any)
      .select("*")
      .eq("user_id", user.id);
    setSelections(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSelections();
  }, [fetchSelections]);

  const isSelected = useCallback(
    (moduleName: string) => selections.some((s) => s.module_name === moduleName),
    [selections]
  );

  const toggleModule = useCallback(
    async (moduleName: string) => {
      if (!user) return;
      const existing = selections.find((s) => s.module_name === moduleName);
      if (existing) {
        await (supabase.from("trial_module_selections") as any)
          .delete()
          .eq("id", existing.id);
      } else {
        await (supabase.from("trial_module_selections") as any).insert({
          user_id: user.id,
          module_name: moduleName,
        });
      }
      await fetchSelections();
    },
    [user, selections, fetchSelections]
  );

  return { selections, loading, isSelected, toggleModule, refreshSelections: fetchSelections };
}
