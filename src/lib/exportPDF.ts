import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Show } from "@/hooks/useShows";

export function exportShowsPDF(shows: Show[]) {
  const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date));

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Agenda de Shows", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 5;

  // Line
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  if (sorted.length === 0) {
    doc.setFontSize(12);
    doc.text("Nenhum show cadastrado.", pageW / 2, y, { align: "center" });
  } else {
    // Table header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
    doc.text("Data", margin + 4, y);
    doc.text("Dia", margin + 35, y);
    doc.text("Cidade", margin + 60, y);
    doc.text("Estado", margin + 110, y);
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

      doc.text(dateFormatted, margin + 4, y);
      doc.text(dayOfWeek, margin + 35, y);
      doc.text(show.cidade, margin + 60, y);
      doc.text(show.estado || "", margin + 110, y);
      y += 8;
    });

    // Footer summary
    y += 4;
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${sorted.length} show${sorted.length !== 1 ? "s" : ""}`, margin + 4, y);
  }

  doc.save("agenda-de-shows.pdf");
}
