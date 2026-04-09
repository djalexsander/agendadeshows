import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ManualPlanOverride {
  id: string;
  user_id: string;
  plan_code: string;
  is_active: boolean;
  granted_by_user_id: string;
  granted_at: string;
  revoked_by_user_id: string | null;
  revoked_at: string | null;
  reason: string | null;
  notes: string | null;
}

export interface ManualModuleOverride {
  id: string;
  user_id: string;
  module_name: string;
  is_active: boolean;
  granted_by_user_id: string;
  granted_at: string;
  revoked_by_user_id: string | null;
  revoked_at: string | null;
  reason: string | null;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  target_user_id: string;
  action_type: string;
  resource_type: string;
  resource_code: string;
  previous_value: string | null;
  new_value: string | null;
  reason: string | null;
  notes: string | null;
  performed_by_user_id: string;
  performed_at: string;
  metadata: any;
}

/**
 * Hook for fetching manual overrides for a specific user (admin use).
 */
export function useManualOverrides(targetUserId: string | null) {
  const [planOverride, setPlanOverride] = useState<ManualPlanOverride | null>(null);
  const [moduleOverrides, setModuleOverrides] = useState<ManualModuleOverride[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    const [planRes, modRes, logRes] = await Promise.all([
      (supabase.from("manual_plan_overrides") as any)
        .select("*")
        .eq("user_id", targetUserId)
        .eq("is_active", true)
        .limit(1),
      (supabase.from("manual_module_overrides") as any)
        .select("*")
        .eq("user_id", targetUserId)
        .eq("is_active", true),
      (supabase.from("admin_access_audit_logs") as any)
        .select("*")
        .eq("target_user_id", targetUserId)
        .order("performed_at", { ascending: false })
        .limit(20),
    ]);

    setPlanOverride(planRes.data?.[0] ?? null);
    setModuleOverrides(modRes.data ?? []);
    setAuditLogs(logRes.data ?? []);
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { planOverride, moduleOverrides, auditLogs, loading, refresh: fetch };
}

/**
 * Hook for the current user's own manual overrides (client-side).
 */
export function useMyManualOverrides() {
  const [planOverride, setPlanOverride] = useState<ManualPlanOverride | null>(null);
  const [moduleOverrides, setModuleOverrides] = useState<ManualModuleOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwn = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [planRes, modRes] = await Promise.all([
        (supabase.from("manual_plan_overrides") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1),
        (supabase.from("manual_module_overrides") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);

      setPlanOverride(planRes.data?.[0] ?? null);
      setModuleOverrides(modRes.data ?? []);
      setLoading(false);
    };
    fetchOwn();
  }, []);

  const hasManualModule = useCallback(
    (moduleName: string) => moduleOverrides.some((m) => m.module_name === moduleName),
    [moduleOverrides]
  );

  return { planOverride, moduleOverrides, hasManualModule, loading };
}

// ── Admin actions ──

async function writeAuditLog(params: {
  targetUserId: string;
  actionType: string;
  resourceType: string;
  resourceCode: string;
  previousValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  notes?: string | null;
  performedByUserId: string;
}) {
  await (supabase.from("admin_access_audit_logs") as any).insert({
    target_user_id: params.targetUserId,
    action_type: params.actionType,
    resource_type: params.resourceType,
    resource_code: params.resourceCode,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
    reason: params.reason ?? null,
    notes: params.notes ?? null,
    performed_by_user_id: params.performedByUserId,
  });
}

export async function grantManualPlan(params: {
  targetUserId: string;
  planCode: string;
  reason?: string;
  notes?: string;
  adminUserId: string;
}) {
  // Revoke any existing active override first
  await (supabase.from("manual_plan_overrides") as any)
    .update({ is_active: false, revoked_by_user_id: params.adminUserId, revoked_at: new Date().toISOString() })
    .eq("user_id", params.targetUserId)
    .eq("is_active", true);

  // Create new override
  await (supabase.from("manual_plan_overrides") as any).insert({
    user_id: params.targetUserId,
    plan_code: params.planCode,
    is_active: true,
    granted_by_user_id: params.adminUserId,
    reason: params.reason || null,
    notes: params.notes || null,
  });

  await writeAuditLog({
    targetUserId: params.targetUserId,
    actionType: "grant_plan",
    resourceType: "plan",
    resourceCode: params.planCode,
    newValue: params.planCode,
    reason: params.reason,
    notes: params.notes,
    performedByUserId: params.adminUserId,
  });
}

export async function revokeManualPlan(params: {
  targetUserId: string;
  adminUserId: string;
  reason?: string;
  currentPlanCode?: string;
}) {
  await (supabase.from("manual_plan_overrides") as any)
    .update({ is_active: false, revoked_by_user_id: params.adminUserId, revoked_at: new Date().toISOString() })
    .eq("user_id", params.targetUserId)
    .eq("is_active", true);

  await writeAuditLog({
    targetUserId: params.targetUserId,
    actionType: "revoke_plan",
    resourceType: "plan",
    resourceCode: params.currentPlanCode || "unknown",
    previousValue: params.currentPlanCode,
    newValue: null,
    reason: params.reason,
    performedByUserId: params.adminUserId,
  });
}

export async function grantManualModule(params: {
  targetUserId: string;
  moduleName: string;
  reason?: string;
  notes?: string;
  adminUserId: string;
}) {
  // Check if there's already an active override
  const { data: existing } = await (supabase.from("manual_module_overrides") as any)
    .select("id")
    .eq("user_id", params.targetUserId)
    .eq("module_name", params.moduleName)
    .eq("is_active", true)
    .limit(1);

  if (existing && existing.length > 0) return; // Already granted

  await (supabase.from("manual_module_overrides") as any).insert({
    user_id: params.targetUserId,
    module_name: params.moduleName,
    is_active: true,
    granted_by_user_id: params.adminUserId,
    reason: params.reason || null,
    notes: params.notes || null,
  });

  await writeAuditLog({
    targetUserId: params.targetUserId,
    actionType: "grant_module",
    resourceType: "module",
    resourceCode: params.moduleName,
    newValue: "active",
    reason: params.reason,
    notes: params.notes,
    performedByUserId: params.adminUserId,
  });
}

export async function revokeManualModule(params: {
  targetUserId: string;
  moduleName: string;
  adminUserId: string;
  reason?: string;
}) {
  await (supabase.from("manual_module_overrides") as any)
    .update({ is_active: false, revoked_by_user_id: params.adminUserId, revoked_at: new Date().toISOString() })
    .eq("user_id", params.targetUserId)
    .eq("module_name", params.moduleName)
    .eq("is_active", true);

  await writeAuditLog({
    targetUserId: params.targetUserId,
    actionType: "revoke_module",
    resourceType: "module",
    resourceCode: params.moduleName,
    previousValue: "active",
    newValue: null,
    reason: params.reason,
    performedByUserId: params.adminUserId,
  });
}
