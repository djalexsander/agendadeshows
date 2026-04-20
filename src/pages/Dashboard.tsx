import { useState, useMemo } from "react";
import { format, isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Image, BarChart3, MapPin, LogOut, Clock, Navigation, Bell, RefreshCw, Puzzle, Lock, DollarSign, UsersRound, FileBarChart, Crown } from "lucide-react";
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
import { AgendaHero } from "@/components/agenda/AgendaHero";
import { AgendaSummaryCard } from "@/components/agenda/AgendaSummaryCard";
import { EventListItem } from "@/components/agenda/EventListItem";

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

  // Header action buttons (standalone mode only) — kept for parity
  const headerActions = (
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
        title="Atualizar"
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
          title="Exportar PNG"
        >
          <Image className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-border opacity-70"
          onClick={() => navigate("/modulos")}
          title="Módulo bloqueado"
        >
          <Lock className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant={pushEnabled ? "default" : "outline"}
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
        onClick={togglePush}
        title={pushEnabled ? "Desativar notificações" : "Ativar notificações"}
      >
        <Bell className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
        onClick={signOut}
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  const embeddedExportButton = (
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
  );

  return (
    <div className={isEmbedded ? "" : "min-h-screen bg-background"}>
      <div
        className={`max-w-6xl mx-auto ${
          isEmbedded ? "p-4 md:p-8" : "px-4 md:px-8 pt-6 pb-8"
        } space-y-5 md:space-y-6`}
      >
        {/* Premium hero */}
        <AgendaHero
          userName={profile?.nome}
          totalShows={shows.length}
          monthShowsCount={monthShows.length}
          nextShow={nextShow}
          embedded={isEmbedded}
          rightSlot={isEmbedded ? embeddedExportButton : headerActions}
        />

        {/* Quick nav for modules (standalone only) */}
        {!isEmbedded && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
                  className="rounded-xl gap-2 shrink-0 border-border bg-card hover:bg-secondary/60"
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
          <AgendaSummaryCard
            icon={CalendarDays}
            value={monthShows.length}
            label="Eventos no mês"
            accent="primary"
            onClick={() => {
              const el = document.getElementById("month-shows-list");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
          <AgendaSummaryCard
            icon={BarChart3}
            value={shows.length}
            label="Total de eventos"
            accent="accent"
            onClick={() => setAllShowsOpen(true)}
          />
          <AgendaSummaryCard
            icon={Clock}
            value={nextShow ? format(parseISO(nextShow.date), "dd/MM/yy") : "—"}
            label={nextShow ? "Próximo evento" : "Sem eventos"}
            accent="primary"
            onClick={nextShow ? () => handleShowClick(nextShow.date) : undefined}
          />
          <AgendaSummaryCard
            icon={Navigation}
            value={nextShow ? nextShow.cidade : "—"}
            label="Próxima cidade"
            accent="accent"
            onClick={nextShow ? () => handleShowClick(nextShow.date) : undefined}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* Calendar */}
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold tracking-wide">Calendário</h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-secondary/40"
              >
                Hoje
              </button>
            </div>
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
                caption_label: "text-base font-bold capitalize tracking-tight",
                nav: "space-x-2 flex items-center",
                nav_button:
                  "h-9 w-9 bg-secondary/60 hover:bg-primary/15 hover:text-primary rounded-xl p-0 flex items-center justify-center text-foreground transition-all",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell:
                  "text-muted-foreground/70 rounded-md flex-1 font-semibold text-[10px] uppercase tracking-wider pb-2",
                row: "flex w-full mt-1",
                cell: "flex-1 text-center text-sm p-0.5 relative",
                day: "h-11 w-full rounded-xl font-medium hover:bg-secondary/60 transition-colors flex flex-col items-center justify-center gap-0.5",
                day_range_end: "day-range-end",
                day_selected:
                  "ring-2 ring-primary ring-offset-2 ring-offset-card",
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
                    confirmado: "bg-[hsl(140,60%,45%)] text-white shadow-sm shadow-[hsl(140,60%,45%)]/30",
                    finalizado: "bg-blue-500 text-white shadow-sm shadow-blue-500/30",
                    pendente: "bg-yellow-500 text-white shadow-sm shadow-yellow-500/30",
                  };

                  return (
                    <div
                      className={cn(
                        "w-full h-full flex items-center justify-center rounded-lg font-bold transition-all relative",
                        statusColors[primaryStatus],
                      )}
                    >
                      <span>{date.getDate()}</span>
                      {hasMultipleEvents && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-card text-foreground text-[9px] font-bold flex items-center justify-center border border-border ring-1 ring-background">
                          {dayShows.length}
                        </span>
                      )}
                    </div>
                  );
                },
              }}
            />

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-center gap-3 flex-wrap text-[10px] uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[hsl(140,60%,45%)]" /> Confirmado
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> Pendente
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Finalizado
              </span>
            </div>
          </div>

          {/* Events List */}
          <div
            id="month-shows-list"
            className="rounded-2xl bg-card border border-border p-4 md:p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold tracking-wide">
                  Eventos em{" "}
                  <span className="capitalize text-foreground">
                    {format(currentMonth, "MMMM", { locale: ptBR })}
                  </span>
                </h2>
              </div>
              {monthShows.length > 0 && (
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-primary/15 text-primary tabular-nums">
                  {monthShows.length}
                </span>
              )}
            </div>

            {monthShows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                  <CalendarDays className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-foreground/80 text-sm font-medium">Nenhum evento neste mês</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Toque em uma data do calendário para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1 -mr-1">
                {monthShows
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((show) => (
                    <EventListItem
                      key={show.id}
                      show={show}
                      onClick={() => handleShowClick(show.date)}
                    />
                  ))}
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
