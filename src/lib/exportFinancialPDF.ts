import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialEntry, EventSummary } from "@/hooks/useFinancialEntries";

interface ExportData {
  companyName: string;
  periodLabel: string;
  entries: FinancialEntry[];
  eventSummaries: EventSummary[];
  contentType: "resumo" | "detalhado";
}

const CONFIRMED = ["pago", "recebido", "confirmado"];
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcTotals(entries: FinancialEntry[]) {
  const entradasPagas = entries.filter((e) => e.type === "entrada" && CONFIRMED.includes(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const saidasPagas = entries.filter((e) => e.type === "saida" && CONFIRMED.includes(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const pendentes = entries.filter((e) => e.status === "pendente").reduce((s, e) => s + Number(e.amount), 0);
  return { entradasPagas, saidasPagas, pendentes, saldo: entradasPagas - saidasPagas };
}

export function exportFinancialPDF(data: ExportData) {
  const { companyName, periodLabel, entries, eventSummaries, contentType } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 20;
  let pageNum = 1;

  const totals = calcTotals(entries);

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = 20;
    }
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`Página ${pageNum}`, pageW / 2, pageH - 10, { align: "center" });
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageW - margin, pageH - 10, { align: "right" });
    doc.setTextColor(0);
  };

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Financeiro", pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(companyName, pageW / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel}`, pageW / 2, y, { align: "center" });
  y += 4;
  doc.text(`Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 6;

  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Summary cards
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", margin, y);
  y += 6;

  const cardW = (contentW - 6) / 4;
  const cards = [
    { label: "Entradas Pagas", value: fmt(totals.entradasPagas), color: [34, 197, 94] },
    { label: "Saídas Pagas", value: fmt(totals.saidasPagas), color: [239, 68, 68] },
    { label: "Pendentes", value: fmt(totals.pendentes), color: [234, 179, 8] },
    { label: "Saldo Real", value: fmt(totals.saldo), color: totals.saldo >= 0 ? [34, 197, 94] : [239, 68, 68] },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 2);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(card.label, x + 3, y + 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + 3, y + 13);
  });
  doc.setTextColor(0);
  y += 24;

  // Event summaries
  if (eventSummaries.length > 0) {
    checkPage(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`Resumo por evento (${eventSummaries.length})`, margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, contentW, 7, "F");
    doc.text("Evento", margin + 2, y);
    doc.text("Entradas", margin + 75, y);
    doc.text("Saídas", margin + 105, y);
    doc.text("Líquido", margin + 135, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    eventSummaries.forEach((ev, i) => {
      checkPage(7);
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 4, contentW, 7, "F");
      }
      const name = ev.event_name.length > 30 ? ev.event_name.slice(0, 28) + "…" : ev.event_name;
      doc.setTextColor(0);
      doc.text(name, margin + 2, y);
      doc.setTextColor(34, 197, 94);
      doc.text(fmt(ev.entradas), margin + 75, y);
      doc.setTextColor(239, 68, 68);
      doc.text(fmt(ev.saidas), margin + 105, y);
      doc.setTextColor(ev.saldo >= 0 ? 34 : 239, ev.saldo >= 0 ? 197 : 68, ev.saldo >= 0 ? 94 : 68);
      doc.text(fmt(ev.saldo), margin + 135, y);
      y += 6;
    });
    doc.setTextColor(0);
    y += 4;
  }

  // Detailed entries
  if (contentType === "detalhado" && entries.length > 0) {
    checkPage(20);
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Lançamentos (${entries.length})`, margin, y);
    y += 6;

    // Table header
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 3.5, contentW, 6, "F");
    const cols = { nome: margin + 2, evento: margin + 45, cat: margin + 85, tipo: margin + 115, status: margin + 130, valor: margin + 148, data: margin + 165 };
    doc.text("Nome", cols.nome, y);
    doc.text("Evento", cols.evento, y);
    doc.text("Categoria", cols.cat, y);
    doc.text("Tipo", cols.tipo, y);
    doc.text("Status", cols.status, y);
    doc.text("Valor", cols.valor, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const sorted = [...entries].sort((a, b) => (a.data_lancamento || "").localeCompare(b.data_lancamento || ""));
    sorted.forEach((e, i) => {
      checkPage(6);
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 3.5, contentW, 6, "F");
      }
      const truncName = e.title.length > 20 ? e.title.slice(0, 18) + "…" : e.title;
      const truncEvt = (e.event_name || "—").length > 18 ? (e.event_name || "").slice(0, 16) + "…" : (e.event_name || "—");
      const truncCat = (e.categoria || "—").length > 14 ? (e.categoria || "").slice(0, 12) + "…" : (e.categoria || "—");

      doc.setTextColor(0);
      doc.text(truncName, cols.nome, y);
      doc.text(truncEvt, cols.evento, y);
      doc.text(truncCat, cols.cat, y);
      doc.text(e.type === "entrada" ? "Entrada" : "Saída", cols.tipo, y);

      const isPaid = CONFIRMED.includes(e.status);
      doc.setTextColor(isPaid ? 34 : 234, isPaid ? 197 : 179, isPaid ? 94 : 8);
      doc.text(isPaid ? "Pago" : "Pendente", cols.status, y);

      doc.setTextColor(e.type === "entrada" ? 34 : 239, e.type === "entrada" ? 197 : 68, e.type === "entrada" ? 94 : 68);
      doc.text(fmt(Number(e.amount)), cols.valor, y);

      doc.setTextColor(100);
      if (e.data_lancamento) {
        doc.text(format(new Date(e.data_lancamento + "T12:00:00"), "dd/MM/yy"), cols.data || margin + 165, y);
      }
      y += 5.5;
    });
  }

  // Total line
  y += 4;
  checkPage(10);
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Total de lançamentos: ${entries.length}`, margin + 2, y);

  addFooter();
  doc.save(`relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
