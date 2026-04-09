import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileText, Image, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { FinancialEntry, EventSummary } from "@/hooks/useFinancialEntries";
import { exportFinancialPDF } from "@/lib/exportFinancialPDF";
import { exportFinancialPNG } from "@/lib/exportFinancialPNG";

interface Props {
  open: boolean;
  onClose: () => void;
  entries: FinancialEntry[];
  eventSummaries: EventSummary[];
  companyName: string;
}

type ExportFormat = "pdf" | "png";
type PeriodType = "current_month" | "previous_month" | "specific_month" | "custom";
type ContentType = "resumo" | "detalhado";

export function FinancialExportDialog({ open, onClose, entries, eventSummaries, companyName }: Props) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [periodType, setPeriodType] = useState<PeriodType>("current_month");
  const [contentType, setContentType] = useState<ContentType>("detalhado");
  const [specificMonth, setSpecificMonth] = useState(new Date().getMonth());
  const [specificYear, setSpecificYear] = useState(new Date().getFullYear());
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [exporting, setExporting] = useState(false);

  const getDateRange = (): { start: string; end: string; label: string } => {
    const now = new Date();
    switch (periodType) {
      case "current_month": {
        const s = startOfMonth(now);
        const e = endOfMonth(now);
        return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd"), label: format(now, "MMMM 'de' yyyy", { locale: ptBR }) };
      }
      case "previous_month": {
        const prev = subMonths(now, 1);
        return { start: format(startOfMonth(prev), "yyyy-MM-dd"), end: format(endOfMonth(prev), "yyyy-MM-dd"), label: format(prev, "MMMM 'de' yyyy", { locale: ptBR }) };
      }
      case "specific_month": {
        const d = setYear(setMonth(now, specificMonth), specificYear);
        return { start: format(startOfMonth(d), "yyyy-MM-dd"), end: format(endOfMonth(d), "yyyy-MM-dd"), label: format(d, "MMMM 'de' yyyy", { locale: ptBR }) };
      }
      case "custom": {
        const s = customStart || startOfMonth(now);
        const e = customEnd || endOfMonth(now);
        return {
          start: format(s, "yyyy-MM-dd"),
          end: format(e, "yyyy-MM-dd"),
          label: `${format(s, "dd/MM/yyyy")} a ${format(e, "dd/MM/yyyy")}`,
        };
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const range = getDateRange();
      const filtered = entries.filter((e) => {
        const d = e.data_lancamento || e.created_at.slice(0, 10);
        return d >= range.start && d <= range.end;
      });

      const filteredEventSummaries = eventSummaries.filter((ev) => {
        if (!ev.event_date) return false;
        return ev.event_date >= range.start && ev.event_date <= range.end;
      });

      const data = {
        companyName,
        periodLabel: range.label,
        entries: filtered,
        eventSummaries: filteredEventSummaries,
        contentType,
      };

      if (exportFormat === "pdf") {
        exportFinancialPDF(data);
      } else {
        exportFinancialPNG(data);
      }
      onClose();
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(setMonth(new Date(), i), "MMMM", { locale: ptBR }),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Relatório
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Format */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Formato</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={exportFormat === "pdf" ? "default" : "outline"}
                className="gap-2 rounded-xl"
                onClick={() => setExportFormat("pdf")}
              >
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button
                variant={exportFormat === "png" ? "default" : "outline"}
                className="gap-2 rounded-xl"
                onClick={() => setExportFormat("png")}
              >
                <Image className="h-4 w-4" /> PNG
              </Button>
            </div>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês atual</SelectItem>
                <SelectItem value="previous_month">Mês anterior</SelectItem>
                <SelectItem value="specific_month">Selecionar mês</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "specific_month" && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(specificMonth)} onValueChange={(v) => setSpecificMonth(Number(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)} className="capitalize">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(specificYear)} onValueChange={(v) => setSpecificYear(Number(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {periodType === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs rounded-xl", !customStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {customStart ? format(customStart, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs rounded-xl", !customEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {customEnd ? format(customEnd, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Content type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Conteúdo</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resumo">Resumo</SelectItem>
                <SelectItem value="detalhado">Detalhado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full rounded-xl gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Gerando..." : "Exportar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
