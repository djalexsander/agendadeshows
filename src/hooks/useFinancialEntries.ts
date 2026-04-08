import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FinancialEntry {
  id: string;
  title: string;
  type: string;
  amount: number;
  event_name: string | null;
  event_date: string | null;
  notes: string | null;
  created_at: string;
}

export function useFinancialEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("financial_entries")
      .select("id, title, type, amount, event_name, event_date, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setEntries((data as FinancialEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addEntry = useCallback(async (entry: { title: string; type: string; amount: number; event_name?: string; event_date?: string; notes?: string }) => {
    if (!user) return { error: "Não autenticado" };
    const { error } = await (supabase.from("financial_entries") as any).insert({
      user_id: user.id,
      ...entry,
    });
    if (error) return { error: error.message };
    await fetch();
    return { error: null };
  }, [user, fetch]);

  const deleteEntry = useCallback(async (id: string) => {
    await (supabase.from("financial_entries") as any).delete().eq("id", id);
    await fetch();
  }, [fetch]);

  const totals = entries.reduce((acc, e) => {
    if (e.type === "entrada") acc.entradas += Number(e.amount);
    else acc.saidas += Number(e.amount);
    return acc;
  }, { entradas: 0, saidas: 0 });

  return { entries, loading, addEntry, deleteEntry, refresh: fetch, totals: { ...totals, saldo: totals.entradas - totals.saidas } };
}
