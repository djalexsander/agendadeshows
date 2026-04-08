import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";

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
  created_at: string;
}

export function useClientBasePlan() {
  const { user } = useAuth();
  const { config } = useBasePlanConfig();
  const [payments, setPayments] = useState<BasePlanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase.from("base_plan_payments") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const latestPayment = payments.length > 0 ? payments[0] : null;

  const hasPending = payments.some((p) => p.status === "pending_review");

  const createPayment = async (opts: { receiptUrl?: string; notes?: string; amount?: number }) => {
    if (!user || !config) return;

    const { error } = await (supabase.from("base_plan_payments") as any).insert({
      user_id: user.id,
      amount: opts.amount ?? config.price,
      status: "pending_review",
      billing_period: config.billing_period,
      receipt_url: opts.receiptUrl || null,
      notes: opts.notes || null,
    });

    if (!error) {
      // Update profile status
      await supabase
        .from("profiles")
        .update({ status_plano: "pagamento_em_analise" } as any)
        .eq("user_id", user.id);
    }

    await fetchPayments();
    return { error };
  };

  return { payments, latestPayment, hasPending, loading, createPayment, refreshPayments: fetchPayments };
}
