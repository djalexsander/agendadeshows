import { useState, useMemo } from "react";
import { format, isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Image, BarChart3, MapPin, LogOut, Clock, Navigation, Bell, RefreshCw, Puzzle, Lock, DollarSign, Users, UsersRound, FileBarChart, Crown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [allShowsOpen, setAllShowsOpen] = useState(false);
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
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Minha Agenda</h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.nome || "Sua agenda"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
                onClick={() => navigate("/meu-plano")}
                title="Meu Plano"
              >
                <Crown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
                onClick={() => navigate("/modulos")}
                title="Módulos"
              >
                <Puzzle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
                onClick={() => window.location.reload()}
                title="Atualizar página"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {hasModule("export_png") ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-border"
                  onClick={() => setExportOpen(true)}
                  disabled={shows.length === 0}
                >
                  <Image className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-border opacity-70"
                  onClick={() => navigate("/modulos")}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant={pushEnabled ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
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
                {profile?.nome || "Sua agenda pessoal"}
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
        {/* Quick nav for modules */}
        {!isEmbedded && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { label: "Financeiro", icon: DollarSign, path: "/financeiro" },
              { label: "Relatórios", icon: FileBarChart, path: "/relatorios" },
              ...(hasModule("agenda_compartilhada") ? [{ label: "Usuários", icon: UsersRound, path: "/usuarios" }] : []),
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 shrink-0 border-border"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Eventos no mês */}
          <div
            className="rounded-2xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-3 cursor-pointer group hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98]"
            onClick={() => {
              const el = document.getElementById("month-shows-list");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold leading-none">{monthShows.length}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Eventos no mês</p>
            </div>
          </div>

          {/* Card 2: Total de eventos */}
          <div
            className="rounded-2xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-3 cursor-pointer group hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98]"
            onClick={() => setAllShowsOpen(true)}
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold leading-none">{shows.length}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Total de eventos</p>
            </div>
          </div>

          {/* Card 3: Próximo evento */}
          <div
            className="rounded-2xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-3 cursor-pointer group hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98]"
            onClick={() => { if (nextShow) handleShowClick(nextShow.date); }}
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold leading-tight">
                {nextShow
                  ? format(parseISO(nextShow.date), "dd/MM/yy")
                  : "—"}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                {nextShow ? "Próximo evento" : "Sem eventos"}
              </p>
            </div>
          </div>

          {/* Card 4: Próxima cidade */}
          <div
            className="rounded-2xl bg-card border border-border p-4 sm:p-5 flex flex-col gap-3 cursor-pointer group hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98]"
            onClick={() => { if (nextShow) handleShowClick(nextShow.date); }}
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold leading-tight line-clamp-1">
                {nextShow ? nextShow.cidade : "—"}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Próxima cidade</p>
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

          {/* Events List */}
          <div id="month-shows-list" className="rounded-2xl bg-card border border-border p-4 md:p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Eventos em{" "}
              <span className="capitalize text-foreground">
                {format(currentMonth, "MMMM", { locale: ptBR })}
              </span>
            </h2>

            {monthShows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                  <CalendarDays className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhum evento neste mês</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Toque em uma data para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
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
                        className="w-full text-left rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/50 p-3 sm:p-4 transition-colors flex items-center gap-3 sm:gap-4 group"
                      >
                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-primary/15 flex flex-col items-center justify-center shrink-0">
                          <span className="text-base sm:text-lg font-bold text-primary leading-none">
                            {dayNum}
                          </span>
                          <span className="text-[9px] sm:text-[10px] uppercase text-primary/70 leading-none mt-0.5">
                            {dayName}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base text-foreground line-clamp-1">{show.cidade}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground">{show.estado}</span>
                            {show.horario && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground/70">· {show.horario}</span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 whitespace-nowrap ${
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

      {/* All events dialog */}
      <Dialog open={allShowsOpen} onOpenChange={setAllShowsOpen}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Todos os eventos
            </DialogTitle>
            <DialogDescription>{shows.length} evento{shows.length !== 1 ? "s" : ""} cadastrado{shows.length !== 1 ? "s" : ""}</DialogDescription>
          </DialogHeader>
          {shows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum evento cadastrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Toque em uma data para adicionar</p>
            </div>
          ) : (
            <div className="space-y-2 py-2 overflow-y-auto flex-1">
              {[...shows].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/50 p-3 flex items-center gap-3 transition-colors"
                  onClick={() => { setAllShowsOpen(false); handleShowClick(s.date); }}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary leading-none">{format(parseISO(s.date), "dd")}</span>
                    <span className="text-[8px] uppercase text-primary/60 leading-none mt-0.5">{format(parseISO(s.date), "MMM", { locale: ptBR })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground line-clamp-1">{s.evento || s.cidade}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />{s.cidade}{s.estado ? `/${s.estado}` : ""}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(s.date), "dd/MM/yyyy")}
                      </span>
                      {s.horario && <span className="text-[10px] text-muted-foreground">{s.horario}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${
                    s.status === "confirmado" ? "bg-green-500/20 text-green-500" :
                    s.status === "finalizado" ? "bg-blue-500/20 text-blue-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{s.status || "pendente"}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!isEmbedded && (
        <p className="text-center text-[10px] text-muted-foreground/50 py-2">{APP_VERSION}</p>
      )}
    </div>
  );
}
