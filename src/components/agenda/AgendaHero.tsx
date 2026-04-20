import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import type { Show } from "@/hooks/useSupabaseShows";

interface AgendaHeroProps {
  userName?: string | null;
  totalShows: number;
  monthShowsCount: number;
  nextShow: Show | null;
  rightSlot?: React.ReactNode;
  embedded?: boolean;
}

export function AgendaHero({
  userName,
  totalShows,
  monthShowsCount,
  nextShow,
  rightSlot,
  embedded,
}: AgendaHeroProps) {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";

  const firstName = (userName || "").trim().split(/\s+/)[0] || "músico";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 md:p-7">
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {embedded ? "Minha Empresa" : "Minha Agenda"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {greeting}, <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-1">{today}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-card/60 border border-border px-4 py-2.5 backdrop-blur min-w-[110px]">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Eventos no mês
            </p>
            <p className="text-lg font-bold tabular-nums">
              {monthShowsCount}
              <span className="text-muted-foreground/60 text-sm font-normal"> / {totalShows}</span>
            </p>
          </div>
          <div className="rounded-xl bg-card/60 border border-border px-4 py-2.5 backdrop-blur min-w-[140px]">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Próximo evento
            </p>
            <p className="text-sm font-bold truncate">
              {nextShow ? `${format(new Date(nextShow.date + "T12:00:00"), "dd/MM")} · ${nextShow.cidade}` : "—"}
            </p>
          </div>
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
