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
      // Enrich with profile names
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

    // Activate pending modules for this user
    const { data: pendingRequests } = await (supabase.from("module_requests") as any)
      .select("module_name")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (pendingRequests && pendingRequests.length > 0) {
      for (const req of pendingRequests) {
        // Upsert user_modules
        const { data: existing } = await supabase
          .from("user_modules")
          .select("id")
          .eq("user_id", userId)
          .eq("module_name", req.module_name)
          .maybeSingle();

        if (existing) {
          await supabase.from("user_modules").update({ active: true } as any).eq("id", existing.id);
        } else {
          await (supabase.from("user_modules") as any).insert({
            user_id: userId,
            module_name: req.module_name,
            active: true,
          });
        }

        // Update request status
        await (supabase.from("module_requests") as any)
          .update({ status: "approved", reviewed_at: now.toISOString(), reviewed_by: user.id })
          .eq("user_id", userId)
          .eq("module_name", req.module_name)
          .eq("status", "pending");

        // Update module payment status if exists
        await (supabase.from("module_payments") as any)
          .update({ status: "approved", reviewed_at: now.toISOString(), reviewed_by: user.id })
          .eq("user_id", userId)
          .eq("module_name", req.module_name)
          .eq("status", "pending_review");
      }
    }

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

    // Update profile status
    await supabase
      .from("profiles")
      .update({ status_plano: "rejeitado" } as any)
      .eq("user_id", userId);

    await fetchPayments();
  };

  return { payments, loading, refreshPayments: fetchPayments, approvePayment, rejectPayment };
}
