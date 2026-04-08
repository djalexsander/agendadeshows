import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BasePlanPayment {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  billing_period: string;
  receipt_url: string | null;
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  profile_name?: string;
  profile_email?: string;
}

export function useAdminBasePlanPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<BasePlanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("base_plan_payments") as any)
      .select("*")
      .order("submitted_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map((p: any) => p.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { nome: p.nome, email: p.email }])
      );

      setPayments(
        data.map((p: any) => ({
          ...p,
          profile_name: profileMap.get(p.user_id)?.nome || "—",
          profile_email: profileMap.get(p.user_id)?.email || "",
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const activateModulesForUser = async (userId: string, reviewerId: string) => {
    const now = new Date();

    // 1. Activate modules from pending module_requests
    const { data: pendingRequests } = await (supabase.from("module_requests") as any)
      .select("module_name")
      .eq("user_id", userId)
      .eq("status", "pending");

    const activatedModules = new Set<string>();

    if (pendingRequests && pendingRequests.length > 0) {
      for (const req of pendingRequests) {
        await upsertUserModule(userId, req.module_name);
        activatedModules.add(req.module_name);

        await (supabase.from("module_requests") as any)
          .update({ status: "approved", reviewed_at: now.toISOString(), reviewed_by: reviewerId })
          .eq("user_id", userId)
          .eq("module_name", req.module_name)
          .eq("status", "pending");

        await (supabase.from("module_payments") as any)
          .update({ status: "approved", reviewed_at: now.toISOString(), reviewed_by: reviewerId })
          .eq("user_id", userId)
          .eq("module_name", req.module_name)
          .eq("status", "pending_review");
      }
    }

    // 2. Activate modules from trial_module_selections
    const { data: trialSelections } = await (supabase.from("trial_module_selections") as any)
      .select("id, module_name")
      .eq("user_id", userId);

    if (trialSelections && trialSelections.length > 0) {
      for (const sel of trialSelections) {
        if (!activatedModules.has(sel.module_name)) {
          await upsertUserModule(userId, sel.module_name);
        }
      }

      // Clean up trial selections after conversion
      await (supabase.from("trial_module_selections") as any)
        .delete()
        .eq("user_id", userId);
    }
  };

  const upsertUserModule = async (userId: string, moduleName: string) => {
    const { data: existing } = await supabase
      .from("user_modules")
      .select("id")
      .eq("user_id", userId)
      .eq("module_name", moduleName)
      .maybeSingle();

    if (existing) {
      await supabase.from("user_modules").update({ active: true } as any).eq("id", existing.id);
    } else {
      await (supabase.from("user_modules") as any).insert({
        user_id: userId,
        module_name: moduleName,
        active: true,
      });
    }
  };

  const approvePayment = async (paymentId: string, userId: string, amount: number) => {
    if (!user) return;

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update payment status
    await (supabase.from("base_plan_payments") as any)
      .update({
        status: "approved",
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", paymentId);

    // Update user profile
    await supabase
      .from("profiles")
      .update({
        status_plano: "ativo",
        plan_type: "monthly",
        is_paid: true,
        paid_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        valor_plano: amount,
      } as any)
      .eq("user_id", userId);

    // Activate all pending/trial modules
    await activateModulesForUser(userId, user.id);

    await fetchPayments();
  };

  const rejectPayment = async (paymentId: string, userId: string, notes?: string) => {
    if (!user) return;

    const now = new Date();

    await (supabase.from("base_plan_payments") as any)
      .update({
        status: "rejected",
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
        notes: notes || null,
      })
      .eq("id", paymentId);

    await supabase
      .from("profiles")
      .update({ status_plano: "rejeitado" } as any)
      .eq("user_id", userId);

    await fetchPayments();
  };

  const deletePayment = useCallback(
    async (paymentId: string) => {
      const { error } = await (supabase.from("base_plan_payments") as any)
        .delete()
        .eq("id", paymentId);
      if (error) return { error: error.message };
      await fetchPayments();
      return { error: null };
    },
    [fetchPayments]
  );

  return { payments, loading, refreshPayments: fetchPayments, approvePayment, rejectPayment, deletePayment };
}
