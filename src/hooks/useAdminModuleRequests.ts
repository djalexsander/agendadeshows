import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdminModuleRequest {
  id: string;
  user_id: string;
  module_name: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  // joined from profiles
  user_nome?: string;
  user_email?: string;
}

export function useAdminModuleRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminModuleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("module_requests")
      .select("id, user_id, module_name, status, requested_at, reviewed_at, reviewed_by, notes")
      .order("requested_at", { ascending: false });

    if (!data) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Fetch profile names for the user_ids
    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nome, email")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, { nome: p.nome, email: p.email }])
    );

    const enriched: AdminModuleRequest[] = data.map((r) => ({
      ...r,
      user_nome: profileMap.get(r.user_id)?.nome ?? "",
      user_email: profileMap.get(r.user_id)?.email ?? "",
    }));

    setRequests(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approveRequest = useCallback(
    async (requestId: string, userId: string, moduleName: string, notes?: string) => {
      // 1. Update module_requests
      const { error: updateError } = await (supabase.from("module_requests") as any)
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          notes: notes || null,
        })
        .eq("id", requestId);

      if (updateError) return { error: updateError.message };

      // 2. Upsert user_modules (avoid duplicates)
      const { data: existing } = await supabase
        .from("user_modules")
        .select("id")
        .eq("user_id", userId)
        .eq("module_name", moduleName)
        .limit(1);

      if (existing && existing.length > 0) {
        await (supabase.from("user_modules") as any)
          .update({ active: true })
          .eq("id", existing[0].id);
      } else {
        await (supabase.from("user_modules") as any).insert({
          user_id: userId,
          module_name: moduleName,
          active: true,
        });
      }

      await fetchRequests();
      return { error: null };
    },
    [user, fetchRequests]
  );

  const rejectRequest = useCallback(
    async (requestId: string, notes?: string) => {
      const { error } = await (supabase.from("module_requests") as any)
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          notes: notes || null,
        })
        .eq("id", requestId);

      if (error) return { error: error.message };
      await fetchRequests();
      return { error: null };
    },
    [user, fetchRequests]
  );

  const deleteRequest = useCallback(
    async (requestId: string) => {
      const { error } = await (supabase.from("module_requests") as any)
        .delete()
        .eq("id", requestId);
      if (error) return { error: error.message };
      await fetchRequests();
      return { error: null };
    },
    [fetchRequests]
  );

  return { requests, loading, fetchRequests, approveRequest, rejectRequest, deleteRequest };
}
