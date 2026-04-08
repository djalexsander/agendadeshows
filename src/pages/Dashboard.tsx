import { useState, useMemo } from "react";
import { format, isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { Music, Image, CalendarDays, BarChart3, MapPin, LogOut, Clock, Navigation, Bell, RefreshCw, Puzzle, Lock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useSupabaseShows } from "@/hooks/useSupabaseShows";
import { DayEventsDialog } from "@/components/DayEventsDialog";
import { ExportPNGListDialog } from "@/components/ExportPNGListDialog";
import { useAuth } from "@/hooks/useAuth";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import type { Show, ShowStatus } from "@/hooks/useSupabaseShows";
import { useLocation, useNavigate } from "react-router-dom";
import { APP_VERSION } from "@/lib/version";
import { useModules } from "@/hooks/useModules";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEmbedded = location.pathname.startsWith("/admin");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { pushEnabled, togglePush } = usePushSubscription();
  const { hasModule } = useModules();

  const { shows, addShow, updateShow, deleteShow, getShowsByDate, getShowDates, getShowsInMonth } =
    useSupabaseShows();

  const showDates = getShowDates();
  const monthShows = getShowsInMonth(currentMonth);

  const nextShow = useMemo(() => {
    const today = startOfDay(new Date());
    const future = shows
      .filter((s) => isAfter(new Date(s.date + "T23:59:59"), today))
      .sort((a, b) => a.date.localeCompare(b.date));
    return future.length > 0 ? future[0] : null;
  }, [shows]);

  const modifiers = useMemo(() => {
    const dates: Date[] = [];
    showDates.forEach((d) => dates.push(new Date(d + "T12:00:00")));
    return { hasShow: dates };
  }, [showDates]);

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    const dateStr = format(day, "yyyy-MM-dd");
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const handleShowClick = (date: string) => {
    setSelectedDate(date);
    setDialogOpen(true);
    setCurrentMonth(new Date(date + "T12:00:00"));
  };

  const dayShows = selectedDate ? getShowsByDate(selectedDate) : [];

  const handleSave = async (date: string, cidade: string, estado: string, status: ShowStatus, comQuem?: string, horario?: string, local?: string, endereco?: string) => {
    await addShow(date, cidade, estado, status, comQuem, horario, local, endereco);
  };

  const handleUpdate = async (id: string, updates: Partial<Pick<Show, "cidade" | "estado" | "status" | "com_quem_evento" | "horario">>) => {
    await updateShow(id, updates);
  };

  const handleDelete = async (id: string) => {
    await deleteShow(id);
  };

  return (
    <div className={isEmbedded ? "" : "min-h-screen bg-background"}>
      {/* Header — only show when standalone */}
      {!isEmbedded && (
        <header className="px-4 md:px-8 pt-6 pb-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Agenda de Shows</h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.nome_artistico || profile?.nome || "Sua agenda"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => navigate("/modulos")}
                title="Módulos"
              >
                <Puzzle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => window.location.reload()}
                title="Atualizar página"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-border"
                onClick={() => setExportOpen(true)}
                disabled={shows.length === 0}
              >
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
              <Button
                variant={pushEnabled ? "default" : "outline"}
                size="sm"
                className="gap-2 rounded-xl"
                onClick={togglePush}
                title={pushEnabled ? "Desativar notificações" : "Ativar notificações"}
              >
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      <div className={`max-w-6xl mx-auto ${isEmbedded ? 'p-6 md:p-8' : 'px-4 md:px-8 pb-8'} space-y-6`}>
        {/* Embedded header */}
        {isEmbedded && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Minha Agenda</h1>
              <p className="text-muted-foreground text-sm">
                {profile?.nome_artistico || profile?.nome || "Sua agenda pessoal"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-border"
              onClick={() => setExportOpen(true)}
              disabled={shows.length === 0}
            >
              <Image className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        )}
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-card border border-border p-3 sm:p-5 flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{monthShows.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Eventos no mês</p>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 sm:p-5 flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{shows.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total de shows</p>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 sm:p-5 flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-bold truncate">
                {nextShow
                  ? format(parseISO(nextShow.date), "dd/MM/yyyy")
                  : "—"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {nextShow ? "Próximo show" : "Sem próximo"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 sm:p-5 flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-bold truncate">
                {nextShow ? nextShow.cidade : "—"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Cidade próximo</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Calendário
            </h2>
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate + "T12:00:00") : undefined}
              onSelect={handleDayClick}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              modifiers={modifiers}
              modifiersClassNames={{ hasShow: "has-show-date" }}
              className="w-full pointer-events-auto"
              classNames={{
                months: "flex flex-col w-full",
                month: "space-y-3 w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-base font-semibold capitalize",
                nav: "space-x-2 flex items-center",
                nav_button:
                  "h-10 w-10 bg-secondary/50 hover:bg-secondary rounded-xl p-0 flex items-center justify-center text-foreground opacity-80 hover:opacity-100 transition-opacity",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-xs uppercase",
                row: "flex w-full mt-1",
                cell: "flex-1 text-center text-sm p-0.5 relative",
                day: "h-11 w-full rounded-xl font-medium hover:bg-secondary/60 transition-colors flex flex-col items-center justify-center gap-0.5",
                day_range_end: "day-range-end",
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "ring-1 ring-primary/50 text-primary font-bold",
                day_outside: "text-muted-foreground opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_hidden: "invisible",
              }}
              components={{
                DayContent: ({ date }) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const dayShows = isCurrentMonth ? shows.filter((s) => s.date === dateStr) : [];
                  
                  if (dayShows.length === 0) {
                    return (
                      <div className="w-full h-full flex items-center justify-center rounded-lg">
                        <span>{date.getDate()}</span>
                      </div>
                    );
                  }

                  const statuses = new Set(dayShows.map((s) => s.status || "pendente"));
                  const hasMultipleEvents = dayShows.length > 1;

                  // Priority: confirmado > pendente > finalizado
                  const primaryStatus = statuses.has("confirmado")
                    ? "confirmado"
                    : statuses.has("pendente")
                    ? "pendente"
                    : "finalizado";

                  const statusColors: Record<string, string> = {
                    confirmado: "bg-[hsl(140,60%,45%)] text-white",
                    finalizado: "bg-blue-500 text-white",
                    pendente: "bg-yellow-500 text-white",
                  };

                  return (
                    <div
                      className={cn(
                        "w-full h-full flex items-center justify-center rounded-lg font-bold transition-colors relative",
                        statusColors[primaryStatus]
                      )}
                    >
                      <span>{date.getDate()}</span>
                      {hasMultipleEvents && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center border border-background">
                          {dayShows.length}
                        </span>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>

          {/* Shows List */}
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Shows em{" "}
              <span className="capitalize text-foreground">
                {format(currentMonth, "MMMM", { locale: ptBR })}
              </span>
            </h2>

            {monthShows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                  <Music className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhum show neste mês</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Toque em uma data para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                {monthShows
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((show) => {
                    const d = parseISO(show.date);
                    const dayNum = format(d, "dd");
                    const dayName = format(d, "EEE", { locale: ptBR });
                    return (
                      <button
                        key={show.id}
                        onClick={() => handleShowClick(show.date)}
                        className="w-full text-left rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/50 p-4 transition-colors flex items-center gap-4 group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-primary/15 flex flex-col items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary leading-none">
                            {dayNum}
                          </span>
                          <span className="text-[10px] uppercase text-primary/70 leading-none mt-0.5">
                            {dayName}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{show.cidade}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{show.estado}</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${
                            show.status === "confirmado"
                              ? "bg-[hsl(140_60%_45%)]/20 text-[hsl(140_60%_55%)]"
                              : show.status === "finalizado"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {show.status || "pendente"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <DayEventsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedDate={selectedDate}
        dayShows={dayShows}
        onSave={handleSave as any}
        onUpdate={handleUpdate as any}
        onDelete={handleDelete as any}
      />
      <ExportPNGListDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        shows={shows}
      />
      {!isEmbedded && (
        <p className="text-center text-[10px] text-muted-foreground/50 py-2">{APP_VERSION}</p>
      )}
    </div>
  );
}
