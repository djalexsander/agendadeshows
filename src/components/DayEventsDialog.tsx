import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Plus, Music, Users, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShowDialog } from "@/components/ShowDialog";
import type { Show, ShowStatus } from "@/hooks/useSupabaseShows";

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-[hsl(140,60%,45%)]/20 text-[hsl(140,60%,55%)]",
  finalizado: "bg-blue-500/20 text-blue-400",
  pendente: "bg-yellow-500/20 text-yellow-400",
};

interface DayEventsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null;
  dayShows: Show[];
  onSave: (date: string, cidade: string, estado: string, status: ShowStatus, comQuem?: string, horario?: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Show, "cidade" | "estado" | "status" | "com_quem_evento" | "horario">>) => void;
  onDelete: (id: string) => void;
}

export function DayEventsDialog({
  open,
  onClose,
  selectedDate,
  dayShows,
  onSave,
  onUpdate,
  onDelete,
}: DayEventsDialogProps) {
  const [selectedShow, setSelectedShow] = useState<Show | undefined>(undefined);
  const [showDialogOpen, setShowDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (!selectedDate) return null;

  const dateFormatted = format(parseISO(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // If no shows exist for this day, go straight to create mode
  if (dayShows.length === 0 && open && !showDialogOpen) {
    return (
      <ShowDialog
        open={open}
        onClose={onClose}
        selectedDate={selectedDate}
        existingShow={undefined}
        onSave={onSave}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  const handleShowClick = (show: Show) => {
    setSelectedShow(show);
    setIsCreating(false);
    setShowDialogOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedShow(undefined);
    setIsCreating(true);
    setShowDialogOpen(true);
  };

  const handleShowDialogClose = () => {
    setShowDialogOpen(false);
    setSelectedShow(undefined);
    setIsCreating(false);
  };

  return (
    <>
      <Dialog open={open && !showDialogOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Music className="h-5 w-5 text-primary" />
              Eventos do dia
            </DialogTitle>
            <DialogDescription className="text-muted-foreground capitalize">
              {dateFormatted}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {dayShows.map((show) => (
              <button
                key={show.id}
                onClick={() => handleShowClick(show)}
                className="w-full text-left rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/50 p-4 transition-colors flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{show.cidade}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground">{show.estado}</span>
                    {show.horario && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {show.horario}
                      </span>
                    )}
                    {show.com_quem_evento && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {show.com_quem_evento}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg shrink-0 ${STATUS_COLORS[show.status || "pendente"]}`}>
                  {show.status || "pendente"}
                </span>
              </button>
            ))}
          </div>

          <Button onClick={handleNewEvent} className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-5 w-5" />
            Adicionar evento neste dia
          </Button>
        </DialogContent>
      </Dialog>

      <ShowDialog
        open={showDialogOpen}
        onClose={handleShowDialogClose}
        selectedDate={selectedDate}
        existingShow={isCreating ? undefined : selectedShow}
        onSave={(date, cidade, estado, status, comQuem) => {
          onSave(date, cidade, estado, status, comQuem);
          handleShowDialogClose();
        }}
        onUpdate={(id, updates) => {
          onUpdate(id, updates);
          handleShowDialogClose();
        }}
        onDelete={(id) => {
          onDelete(id);
          handleShowDialogClose();
        }}
      />
    </>
  );
}
