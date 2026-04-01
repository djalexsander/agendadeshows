import { useState, useEffect, useCallback } from "react";

export type ShowStatus = "pendente" | "confirmado" | "finalizado";

export interface Show {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  cidade: string;
  estado: string;
  status: ShowStatus;
  // Campos futuros:
  evento?: string;
  horario?: string;
  local?: string;
  observacoes?: string;
}

const STORAGE_KEY = "agenda-shows";

function loadShows(): Show[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveShows(shows: Show[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shows));
}

export function useShows() {
  const [shows, setShows] = useState<Show[]>(loadShows);

  useEffect(() => {
    saveShows(shows);
  }, [shows]);

  const addShow = useCallback((date: string, cidade: string, estado: string) => {
    const newShow: Show = {
      id: crypto.randomUUID(),
      date,
      cidade,
      estado,
    };
    setShows((prev) => [...prev, newShow]);
    return newShow;
  }, []);

  const updateShow = useCallback((id: string, cidade: string, estado: string) => {
    setShows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, cidade, estado } : s))
    );
  }, []);

  const deleteShow = useCallback((id: string) => {
    setShows((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getShowByDate = useCallback(
    (date: string) => shows.find((s) => s.date === date),
    [shows]
  );

  const getShowDates = useCallback(
    () => new Set(shows.map((s) => s.date)),
    [shows]
  );

  const getUpcomingShows = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    return shows
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shows]);

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

  return { shows, addShow, updateShow, deleteShow, getShowByDate, getShowDates, getUpcomingShows, getShowsInMonth };
}
