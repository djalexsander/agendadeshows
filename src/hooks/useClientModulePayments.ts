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
  gateway_provider: string | null;
  gateway_status: string | null;
  pix_payload: string | null;
  pix_qr_code_image: string | null;
  pix_expiration_date: string | null;
  asaas_payment_id: string | null;
}

interface AsaasModulePaymentResult {
  paymentId: string;
  asaasPaymentId: string;
  payload: string;
  qrCodeImage: string;
  expirationDate: string;
  amount: number;
  moduleName: string;
  reused: boolean;
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

  const getPendingAsaasPayment = useCallback(
    (moduleName: string): ModulePayment | null => {
      return payments.find((p) =>
        p.module_name === moduleName &&
        p.status === "pending_review" &&
        p.gateway_provider === "asaas" &&
        p.pix_payload &&
        p.pix_expiration_date &&
        new Date(p.pix_expiration_date) > new Date()
      ) || null;
    },
    [payments]
  );

  /** Create payment via manual upload (legacy) */
  const createModulePayment = useCallback(
    async (moduleName: string, amount: number, opts: { receiptUrl?: string; notes?: string } = {}) => {
      if (!user) return { error: "not_authenticated" };
      if (hasPendingPayment(moduleName)) return { error: "duplicate" };

      await (supabase.from("module_requests") as any).insert({
        user_id: user.id,
        module_name: moduleName,
      });

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

  /** Create PIX payment via Asaas */
  const createAsaasModulePayment = useCallback(
    async (moduleName: string, cpfCnpj?: string): Promise<{ data: AsaasModulePaymentResult | null; error: string | null }> => {
      if (!user) return { data: null, error: "not_authenticated" };

      // Check for reusable pending
      const existing = getPendingAsaasPayment(moduleName);
      if (existing) {
        return {
          data: {
            paymentId: existing.id,
            asaasPaymentId: existing.asaas_payment_id || "",
            payload: existing.pix_payload || "",
            qrCodeImage: existing.pix_qr_code_image || "",
            expirationDate: existing.pix_expiration_date || "",
            amount: existing.amount,
            moduleName,
            reused: true,
          },
          error: null,
        };
      }

      const { data, error } = await supabase.functions.invoke("create-asaas-module-payment", {
        body: { moduleName, cpfCnpj },
      });

      if (error) return { data: null, error: error.message };
      if (data?.error) return { data: null, error: data.error };

      await fetchPayments();
      return { data, error: null };
    },
    [user, getPendingAsaasPayment, fetchPayments]
  );

  return {
    payments,
    loading,
    hasPendingPayment,
    getLatestPayment,
    getPendingAsaasPayment,
    createModulePayment,
    createAsaasModulePayment,
    refreshPayments: fetchPayments,
  };
}
