import { useState, useEffect, useCallback } from "react";

export interface Show {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  cidade: string;
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

  const addShow = useCallback((date: string, cidade: string) => {
    const newShow: Show = {
      id: crypto.randomUUID(),
      date,
      cidade,
    };
    setShows((prev) => [...prev, newShow]);
    return newShow;
  }, []);

  const updateShow = useCallback((id: string, cidade: string) => {
    setShows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, cidade } : s))
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

  return { shows, addShow, updateShow, deleteShow, getShowByDate, getShowDates, getUpcomingShows };
}
