import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Show } from "@/hooks/useSupabaseShows";

export function exportShowsPDF(shows: Show[], startDate?: string, endDate?: string) {
  const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date));

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Agenda de Eventos", pageW / 2, y, { align: "center" });
  y += 8;

  // Subtitle with period
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const periodParts: string[] = [];
  if (startDate) periodParts.push(`De ${format(parseISO(startDate), "dd/MM/yyyy")}`);
  if (endDate) periodParts.push(`${startDate ? "até" : "Até"} ${format(parseISO(endDate), "dd/MM/yyyy")}`);
  const periodText = periodParts.length > 0 ? periodParts.join(" ") : "Todos os eventos";
  doc.text(periodText, pageW / 2, y, { align: "center" });
  y += 5;
  doc.text(`Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 5;

  // Line
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  if (sorted.length === 0) {
    doc.setFontSize(12);
    doc.text("Nenhum evento cadastrado.", pageW / 2, y, { align: "center" });
  } else {
    // Table header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
    const colData = margin + 4;
    const colDia = margin + 28;
    const colCidade = margin + 50;
    const colEstado = margin + 115;
    const colStatus = margin + 135;
    const maxCidadeWidth = colEstado - colCidade - 4;

    doc.text("Data", colData, y);
    doc.text("Dia", colDia, y);
    doc.text("Cidade", colCidade, y);
    doc.text("Estado", colEstado, y);
    doc.text("Status", colStatus, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    sorted.forEach((show, i) => {
      if (y > 270) {
        doc.addPage();
        y = 25;
      }

      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
      }

      const dateFormatted = format(parseISO(show.date), "dd/MM/yyyy");
      const dayOfWeek = format(parseISO(show.date), "EEE", { locale: ptBR });

      let cidadeText = show.cidade;
      while (doc.getTextWidth(cidadeText) > maxCidadeWidth && cidadeText.length > 1) {
        cidadeText = cidadeText.slice(0, -1);
      }
      if (cidadeText !== show.cidade) cidadeText += "…";

      const statusLabel = (show.status || "pendente").charAt(0).toUpperCase() + (show.status || "pendente").slice(1);

      doc.text(dateFormatted, colData, y);
      doc.text(dayOfWeek, colDia, y);
      doc.text(cidadeText, colCidade, y);
      doc.text(show.estado || "", colEstado, y);
      doc.text(statusLabel, colStatus, y);
      y += 8;
    });

    // Footer summary
    y += 4;
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${sorted.length} evento${sorted.length !== 1 ? "s" : ""}`, margin + 4, y);
  }

  doc.save("agenda-de-eventos.pdf");
}
