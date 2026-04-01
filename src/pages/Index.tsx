import { useState, useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { Music, FileDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useShows } from "@/hooks/useShows";
import { ShowDialog } from "@/components/ShowDialog";
import { UpcomingShows } from "@/components/UpcomingShows";
import { exportShowsPDF } from "@/lib/exportPDF";

const Index = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { shows, addShow, updateShow, deleteShow, getShowByDate, getShowDates, getUpcomingShows, getShowsInMonth } = useShows();

  const showDates = getShowDates();
  const upcomingShows = getUpcomingShows();
  const monthShows = getShowsInMonth(currentMonth);

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

  const existingShow = selectedDate ? getShowByDate(selectedDate) : undefined;

  const monthName = format(currentMonth, "MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Agenda de Shows</h1>
              <p className="text-xs text-muted-foreground">Suas datas, sua música</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => exportShowsPDF(shows)}
            disabled={shows.length === 0}
            title="Exportar PDF"
          >
            <FileDown className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Month counter */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/40">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{monthShows.length}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {monthShows.length === 1 ? "show" : "shows"} em <span className="capitalize text-foreground font-medium">{monthName}</span>
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-3 pb-4">
        <Calendar
          mode="single"
          selected={selectedDate ? new Date(selectedDate + "T12:00:00") : undefined}
          onSelect={handleDayClick}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          locale={ptBR}
          modifiers={modifiers}
          modifiersClassNames={{
            hasShow: "has-show-date",
          }}
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
            head_cell:
              "text-muted-foreground rounded-md flex-1 font-medium text-xs uppercase",
            row: "flex w-full mt-1",
            cell: "flex-1 text-center text-sm p-0.5 relative",
            day: "h-11 w-full rounded-xl font-medium hover:bg-secondary/60 transition-colors flex flex-col items-center justify-center gap-0.5",
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today:
              "ring-1 ring-primary/50 text-primary font-bold",
            day_outside: "text-muted-foreground opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible",
          }}
          components={{
            DayContent: ({ date }) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const hasShow = showDates.has(dateStr);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const showHighlight = hasShow && isCurrentMonth;
              return (
                <div className={cn(
                  "w-full h-full flex items-center justify-center rounded-lg transition-colors",
                  showHighlight && "bg-[hsl(140_60%_45%)] text-white font-bold"
                )}>
                  <span>{date.getDate()}</span>
                </div>
              );
            },
          }}
        />
      </div>

      {/* Upcoming Shows */}
      <div className="flex-1 px-5 pb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Próximos Shows
        </h2>
        <UpcomingShows shows={upcomingShows} onShowClick={handleShowClick} />
      </div>

      {/* Dialog */}
      <ShowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedDate={selectedDate}
        existingShow={existingShow}
        onSave={addShow}
        onUpdate={updateShow}
        onDelete={deleteShow}
      />
    </div>
  );
};

export default Index;
