import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, Image, CalendarIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Show } from "@/hooks/useSupabaseShows";
import { exportShowsListPNG } from "@/lib/exportPNG";
import { exportShowsPDF } from "@/lib/exportPDF";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface ExportPNGListDialogProps {
  open: boolean;
  onClose: () => void;
  shows: Show[];
}

export function ExportPNGListDialog({ open, onClose, shows }: ExportPNGListDialogProps) {
  const [exportFormat, setExportFormat] = useState<"png" | "pdf">("png");
  const [mode, setMode] = useState<"mensal" | "periodo">("mensal");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const filtered = shows.filter((s) => {
    if (mode === "mensal") {
      const d = new Date(s.date + "T12:00:00");
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
    if (startStr && s.date < startStr) return false;
    if (endStr && s.date > endStr) return false;
    return true;
  });

  const handleExport = () => {
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

    const periodLabel = mode === "mensal"
      ? `${MESES[selectedMonth]} ${selectedYear}`
      : undefined;
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : undefined;

    if (exportFormat === "png") {
      exportShowsListPNG(sorted, periodLabel, startStr, endStr);
    } else {
      exportShowsPDF(sorted, startStr, endStr);
    }
    onClose();
  };

  const years = Array.from(new Set(shows.map((s) => new Date(s.date + "T12:00:00").getFullYear())));
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.push(currentYear);
  if (!years.includes(currentYear + 1)) years.push(currentYear + 1);
  years.sort();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar Agenda
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escolha o formato e período
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format toggle */}
          <div className="space-y-2">
            <Label className="text-base">Formato</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat("png")}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2",
                  exportFormat === "png"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                <Image className="h-4 w-4" />
                PNG
              </button>
              <button
                onClick={() => setExportFormat("pdf")}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2",
                  exportFormat === "pdf"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="space-y-2">
            <Label className="text-base">Período</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("mensal")}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border",
                  mode === "mensal"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setMode("periodo")}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border",
                  mode === "periodo"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                Por Período
              </button>
            </div>
          </div>

          {mode === "mensal" ? (
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label className="text-base">Mês</Label>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="h-12 text-base bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {MESES.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-2">
                <Label className="text-base">Ano</Label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="h-12 text-base bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
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
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} />
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
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/40">
            <span className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{filtered.length}</span> evento{filtered.length !== 1 ? "s" : ""}{" "}
              {mode === "mensal" ? `em ${MESES[selectedMonth]}` : "no período"}
            </span>
          </div>

          <div className="flex gap-3">
            {mode === "periodo" && (startDate || endDate) && (
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
              disabled={filtered.length === 0}
              className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 gap-2"
            >
              {exportFormat === "png" ? <Image className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
              Exportar {exportFormat.toUpperCase()} ({filtered.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
