import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdminModulePayment {
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
  reviewed_by: string | null;
  user_nome?: string;
  user_email?: string;
}

export function useAdminModulePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<AdminModulePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("module_payments") as any)
      .select("*")
      .order("submitted_at", { ascending: false });

    if (!data) { setPayments([]); setLoading(false); return; }

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
        user_nome: profileMap.get(p.user_id)?.nome || "—",
        user_email: profileMap.get(p.user_id)?.email || "",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const approvePayment = useCallback(async (payment: AdminModulePayment) => {
    if (!user) return;
    const now = new Date().toISOString();

    // Update payment
    await (supabase.from("module_payments") as any)
      .update({ status: "approved", reviewed_at: now, reviewed_by: user.id })
      .eq("id", payment.id);

    // Update module_request to approved
    await (supabase.from("module_requests") as any)
      .update({ status: "approved", reviewed_at: now, reviewed_by: user.id })
      .eq("user_id", payment.user_id)
      .eq("module_name", payment.module_name)
      .eq("status", "pending");

    // Upsert user_modules
    const { data: existing } = await supabase
      .from("user_modules")
      .select("id")
      .eq("user_id", payment.user_id)
      .eq("module_name", payment.module_name)
      .limit(1);

    if (existing && existing.length > 0) {
      await (supabase.from("user_modules") as any)
        .update({ active: true })
        .eq("id", existing[0].id);
    } else {
      await (supabase.from("user_modules") as any).insert({
        user_id: payment.user_id,
        module_name: payment.module_name,
        active: true,
      });
    }

    await fetchPayments();
  }, [user, fetchPayments]);

  const rejectPayment = useCallback(async (payment: AdminModulePayment, reason?: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    await (supabase.from("module_payments") as any)
      .update({ status: "rejected", reviewed_at: now, reviewed_by: user.id, rejection_reason: reason || null })
      .eq("id", payment.id);

    await (supabase.from("module_requests") as any)
      .update({ status: "rejected", reviewed_at: now, reviewed_by: user.id, notes: reason || null })
      .eq("user_id", payment.user_id)
      .eq("module_name", payment.module_name)
      .eq("status", "pending");

    await fetchPayments();
  }, [user, fetchPayments]);

  const deletePayment = useCallback(
    async (paymentId: string) => {
      const { error } = await (supabase.from("module_payments") as any)
        .delete()
        .eq("id", paymentId);
      if (error) return { error: error.message };
      await fetchPayments();
      return { error: null };
    },
    [fetchPayments]
  );

  return { payments, loading, fetchPayments, approvePayment, rejectPayment, deletePayment };
}
