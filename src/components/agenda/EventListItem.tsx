import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Clock } from "lucide-react";
import type { Show } from "@/hooks/useSupabaseShows";

interface EventListItemProps {
  show: Show;
  onClick: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  confirmado: "bg-[hsl(140_60%_45%)]/15 text-[hsl(140_60%_55%)] ring-[hsl(140_60%_45%)]/30",
  finalizado: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
  pendente: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  confirmado: "Confirmado",
  finalizado: "Finalizado",
  pendente: "Pendente",
};

export function EventListItem({ show, onClick }: EventListItemProps) {
  const d = parseISO(show.date);
  const dayNum = format(d, "dd");
  const dayName = format(d, "EEE", { locale: ptBR });
  const status = show.status || "pendente";
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pendente;
  const statusLabel = STATUS_LABELS[status] || status;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 hover:border-border p-3 sm:p-3.5 transition-all flex items-center gap-3 sm:gap-4 group"
    >
      {/* Date pill */}
      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20 flex flex-col items-center justify-center shrink-0">
        <span className="text-base sm:text-lg font-bold text-primary leading-none tabular-nums">
          {dayNum}
        </span>
        <span className="text-[9px] sm:text-[10px] uppercase text-primary/70 font-semibold leading-none mt-1 tracking-wider">
          {dayName}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base text-foreground line-clamp-1">
          {show.evento || show.cidade}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {show.cidade}
            {show.estado ? `/${show.estado}` : ""}
          </span>
          {show.horario && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80">
              <Clock className="h-3 w-3 shrink-0" />
              {show.horario}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap ring-1 ${statusStyle}`}
      >
        {statusLabel}
      </span>
    </button>
  );
}
