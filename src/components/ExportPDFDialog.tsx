import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Show } from "@/hooks/useShows";
import { exportShowsPDF } from "@/lib/exportPDF";

interface ExportPDFDialogProps {
  open: boolean;
  onClose: () => void;
  shows: Show[];
}

export function ExportPDFDialog({ open, onClose, shows }: ExportPDFDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleExport = () => {
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : undefined;

    const filtered = shows.filter((s) => {
      if (startStr && s.date < startStr) return false;
      if (endStr && s.date > endStr) return false;
      return true;
    });

    exportShowsPDF(filtered, startStr, endStr);
    onClose();
  };

  const filteredCount = shows.filter((s) => {
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
    if (startStr && s.date < startStr) return false;
    if (endStr && s.date > endStr) return false;
    return true;
  }).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar PDF
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selecione o período para exportar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-base">Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-base justify-start bg-secondary/50 border-border",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Sem limite"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-base">Data Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-base justify-start bg-secondary/50 border-border",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Sem limite"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/40">
            <span className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{filteredCount}</span> evento{filteredCount !== 1 ? "s" : ""} no período
            </span>
          </div>

          <div className="flex gap-3">
            {(startDate || endDate) && (
              <Button
                onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                variant="secondary"
                className="h-12 text-base"
              >
                Limpar
              </Button>
            )}
            <Button
              onClick={handleExport}
              disabled={filteredCount === 0}
              className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar ({filteredCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
