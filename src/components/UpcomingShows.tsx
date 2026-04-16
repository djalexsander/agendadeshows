import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Calendar } from "lucide-react";
import type { Show } from "@/hooks/useShows";

interface UpcomingShowsProps {
  shows: Show[];
  onShowClick: (date: string) => void;
}

export function UpcomingShows({ shows, onShowClick }: UpcomingShowsProps) {
  if (shows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-base">Nenhum evento agendado</p>
        <p className="text-sm mt-1">Toque em uma data para adicionar</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shows.slice(0, 5).map((show) => {
        const dateFormatted = format(parseISO(show.date), "dd MMM", { locale: ptBR });
        const dayOfWeek = format(parseISO(show.date), "EEE", { locale: ptBR });

        return (
          <button
            key={show.id}
            onClick={() => onShowClick(show.date)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
          >
            <div className="flex flex-col items-center min-w-[50px]">
              <span className="text-lg font-bold text-primary">{dateFormatted.split(" ")[0]}</span>
              <span className="text-xs text-muted-foreground uppercase">{dateFormatted.split(" ")[1]}</span>
              <span className="text-xs text-muted-foreground capitalize">{dayOfWeek}</span>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="text-base font-medium truncate">
                {show.cidade}{show.estado ? ` — ${show.estado}` : ""}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
