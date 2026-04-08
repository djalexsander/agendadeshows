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
  data_lancamento: string | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  categoria: string | null;
  forma_pagamento: string | null;
  status: string;
  pessoa: string | null;
  comprovante_url: string | null;
  parcelas: number;
  parcela_atual: number;
  recorrencia: string;
  show_id: string | null;
}

export type FinancialFilters = {
  type?: "entrada" | "saida";
  status?: string;
  categoria?: string;
  periodoInicio?: string;
  periodoFim?: string;
};

export function useFinancialEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FinancialFilters>({});

  const fetchEntries = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("financial_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("data_lancamento", { ascending: false });
    setEntries((data as FinancialEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async (entry: {
    title: string;
    type: string;
    amount: number;
    event_name?: string;
    event_date?: string;
    notes?: string;
    data_lancamento?: string;
    data_vencimento?: string;
    data_pagamento?: string;
    categoria?: string;
    forma_pagamento?: string;
    status?: string;
    pessoa?: string;
    comprovante_url?: string;
    parcelas?: number;
    parcela_atual?: number;
    recorrencia?: string;
    show_id?: string;
  }) => {
    if (!user) return { error: "Não autenticado" };
    const { error } = await (supabase.from("financial_entries") as any).insert({
      user_id: user.id,
      ...entry,
    });
    if (error) return { error: error.message };
    await fetchEntries();
    return { error: null };
  }, [user, fetchEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    await (supabase.from("financial_entries") as any).delete().eq("id", id);
    await fetchEntries();
  }, [fetchEntries]);

  // Apply client-side filters
  const filtered = entries.filter((e) => {
    if (filters.type && e.type !== filters.type) return false;
    if (filters.status && e.status !== filters.status) return false;
    if (filters.categoria && e.categoria !== filters.categoria) return false;
    if (filters.periodoInicio) {
      const d = e.data_lancamento || e.created_at.slice(0, 10);
      if (d < filters.periodoInicio) return false;
    }
    if (filters.periodoFim) {
      const d = e.data_lancamento || e.created_at.slice(0, 10);
      if (d > filters.periodoFim) return false;
    }
    return true;
  });

  const totals = filtered.reduce((acc, e) => {
    if (e.type === "entrada") acc.entradas += Number(e.amount);
    else acc.saidas += Number(e.amount);
    return acc;
  }, { entradas: 0, saidas: 0 });

  const categories = [...new Set(entries.map((e) => e.categoria).filter(Boolean))] as string[];

  return {
    entries: filtered,
    allEntries: entries,
    loading,
    addEntry,
    deleteEntry,
    refresh: fetchEntries,
    totals: { ...totals, saldo: totals.entradas - totals.saidas },
    filters,
    setFilters,
    categories,
  };
}
