import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ModuleName } from "@/hooks/useModules";

export interface ModuleRequest {
  id: string;
  module_name: string;
  status: string;
  requested_at: string;
  notes: string | null;
}

export function useModuleRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ModuleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("module_requests")
      .select("id, module_name, status, requested_at, notes")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false });

    setRequests((data as ModuleRequest[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const hasPendingRequest = useCallback(
    (moduleName: ModuleName) =>
      requests.some((r) => r.module_name === moduleName && r.status === "pending"),
    [requests]
  );

  const createRequest = useCallback(
    async (moduleName: ModuleName) => {
      if (!user) return { error: "Usuário não autenticado" };

      if (hasPendingRequest(moduleName)) {
        return { error: "duplicate" };
      }

      const { error } = await (supabase.from("module_requests") as any).insert({
        user_id: user.id,
        module_name: moduleName,
      });

      if (error) {
        // unique constraint violation = duplicate pending
        if (error.code === "23505") return { error: "duplicate" };
        return { error: error.message };
      }

      await fetchRequests();
      return { error: null };
    },
    [user, hasPendingRequest, fetchRequests]
  );

  return { requests, loading, hasPendingRequest, createRequest, refreshRequests: fetchRequests };
}
