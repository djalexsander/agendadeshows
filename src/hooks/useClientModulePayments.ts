import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ModulePayment {
  id: string;
  user_id: string;
  module_name: string;
  amount: number;
  status: string;
  receipt_url: string | null;
  notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
}

export function useClientModulePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<ModulePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase.from("module_payments") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const hasPendingPayment = useCallback(
    (moduleName: string) => payments.some((p) => p.module_name === moduleName && p.status === "pending_review"),
    [payments]
  );

  const getLatestPayment = useCallback(
    (moduleName: string) => payments.find((p) => p.module_name === moduleName) || null,
    [payments]
  );

  const createModulePayment = useCallback(
    async (moduleName: string, amount: number, opts: { receiptUrl?: string; notes?: string } = {}) => {
      if (!user) return { error: "not_authenticated" };

      if (hasPendingPayment(moduleName)) return { error: "duplicate" };

      // Create module_request if none pending
      await (supabase.from("module_requests") as any).insert({
        user_id: user.id,
        module_name: moduleName,
      });

      // Create payment
      const { error } = await (supabase.from("module_payments") as any).insert({
        user_id: user.id,
        module_name: moduleName,
        amount,
        status: "pending_review",
        receipt_url: opts.receiptUrl || null,
        notes: opts.notes || null,
      });

      if (error) return { error: error.message };

      await fetchPayments();
      return { error: null };
    },
    [user, hasPendingPayment, fetchPayments]
  );

  return { payments, loading, hasPendingPayment, getLatestPayment, createModulePayment, refreshPayments: fetchPayments };
}
