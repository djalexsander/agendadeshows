import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ShowStatus = "pendente" | "confirmado" | "finalizado";

export interface Show {
  id: string;
  date: string;
  cidade: string;
  estado: string;
  status: ShowStatus;
  evento?: string;
  horario?: string;
  local?: string;
  observacoes?: string;
  com_quem_evento?: string;
}

export function useSupabaseShows() {
  const { user } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("shows")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (data) {
      setShows(
        data.map((s) => ({
          id: s.id,
          date: s.date,
          cidade: s.cidade,
          estado: s.estado,
          status: (s.status || "pendente") as ShowStatus,
          evento: s.evento || undefined,
          horario: s.horario || undefined,
          local: s.local || undefined,
          observacoes: s.observacoes || undefined,
          com_quem_evento: s.com_quem_evento || undefined,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  const addShow = useCallback(
    async (date: string, cidade: string, estado: string, status: ShowStatus = "pendente") => {
      if (!user) return;
      const { data, error } = await supabase
        .from("shows")
        .insert({ user_id: user.id, date, cidade, estado, status })
        .select()
        .single();
      if (data && !error) {
        setShows((prev) => [
          ...prev,
          {
            id: data.id,
            date: data.date,
            cidade: data.cidade,
            estado: data.estado,
            status: (data.status || "pendente") as ShowStatus,
          },
        ]);
      }
    },
    [user]
  );

  const updateShow = useCallback(
    async (id: string, updates: Partial<Pick<Show, "cidade" | "estado" | "status">>) => {
      await supabase.from("shows").update(updates).eq("id", id);
      setShows((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    },
    []
  );

  const deleteShow = useCallback(async (id: string) => {
    await supabase.from("shows").delete().eq("id", id);
    setShows((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getShowByDate = useCallback(
    (date: string) => shows.find((s) => s.date === date),
    [shows]
  );

  const getShowDates = useCallback(() => new Set(shows.map((s) => s.date)), [shows]);

  const getShowsInMonth = useCallback(
    (month: Date) => {
      const y = month.getFullYear();
      const m = month.getMonth();
      return shows.filter((s) => {
        const d = new Date(s.date + "T12:00:00");
        return d.getFullYear() === y && d.getMonth() === m;
      });
    },
    [shows]
  );

  return {
    shows,
    loading,
    addShow,
    updateShow,
    deleteShow,
    getShowByDate,
    getShowDates,
    getShowsInMonth,
    refetch: fetchShows,
  };
}
