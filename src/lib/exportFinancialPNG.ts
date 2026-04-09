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
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcTotals(entries: FinancialEntry[]) {
  const entradasPagas = entries.filter((e) => e.type === "entrada" && CONFIRMED.includes(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const saidasPagas = entries.filter((e) => e.type === "saida" && CONFIRMED.includes(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const pendentes = entries.filter((e) => e.status === "pendente").reduce((s, e) => s + Number(e.amount), 0);
  return { entradasPagas, saidasPagas, pendentes, saldo: entradasPagas - saidasPagas };
}

export function exportFinancialPNG(data: ExportData) {
  const { companyName, periodLabel, entries, eventSummaries, contentType } = data;
  const scale = 2;
  const W = 800 * scale;
  const px = (v: number) => v * scale;
  const margin = px(40);
  const totals = calcTotals(entries);

  // Pre-calc height
  let estimatedH = 360; // header + cards
  if (eventSummaries.length > 0) estimatedH += 60 + eventSummaries.length * 36;
  if (contentType === "detalhado") estimatedH += 60 + entries.length * 34;
  estimatedH += 80; // footer
  const H = Math.max(800, estimatedH) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // BG
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1a1025");
  bg.addColorStop(0.5, "#0f172a");
  bg.addColorStop(1, "#0c0f1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.3, H * 0.05, 0, W * 0.3, H * 0.05, W * 0.5);
  glow.addColorStop(0, "rgba(139, 92, 246, 0.06)");
  glow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const text = (t: string, x: number, yPos: number, size: number, color: string, weight = "400", align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${px(size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, x, yPos);
    ctx.textAlign = "left";
  };

  let y = px(45);

  // Header
  text("RELATÓRIO FINANCEIRO", margin, y, 11, "rgba(139, 92, 246, 0.7)", "600");
  y += px(10);
  const lineG = ctx.createLinearGradient(margin, y, margin + px(120), y);
  lineG.addColorStop(0, "#8b5cf6");
  lineG.addColorStop(1, "transparent");
  ctx.strokeStyle = lineG;
  ctx.lineWidth = px(2);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(margin + px(120), y);
  ctx.stroke();
  y += px(30);

  text(companyName, margin, y, 22, "#ffffff", "700");
  y += px(16);
  text(periodLabel, margin, y, 14, "rgba(255,255,255,0.5)", "400");
  y += px(10);
  text(`Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, margin, y, 10, "rgba(255,255,255,0.25)", "400");
  y += px(25);

  // Separator
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = px(1);
  ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
  y += px(20);

  // Summary cards
  const cardW = (W - margin * 2 - px(12)) / 4;
  const cardH = px(60);
  const cardsData = [
    { label: "Entradas Pagas", value: fmtBRL(totals.entradasPagas), color: "rgba(74, 222, 128, 0.9)", bg: "rgba(74, 222, 128, 0.08)" },
    { label: "Saídas Pagas", value: fmtBRL(totals.saidasPagas), color: "rgba(248, 113, 113, 0.9)", bg: "rgba(248, 113, 113, 0.08)" },
    { label: "Pendentes", value: fmtBRL(totals.pendentes), color: "rgba(250, 204, 21, 0.9)", bg: "rgba(250, 204, 21, 0.08)" },
    { label: "Saldo Real", value: fmtBRL(totals.saldo), color: totals.saldo >= 0 ? "rgba(74, 222, 128, 0.9)" : "rgba(248, 113, 113, 0.9)", bg: "rgba(139, 92, 246, 0.08)" },
  ];

  cardsData.forEach((card, i) => {
    const x = margin + i * (cardW + px(4));
    ctx.fillStyle = card.bg;
    roundRect(ctx, x, y, cardW, cardH, px(8));
    text(card.label, x + px(8), y + px(18), 9, "rgba(255,255,255,0.45)", "500");
    text(card.value, x + px(8), y + px(40), 14, card.color, "700");
  });
  y += cardH + px(20);

  // Event summaries
  if (eventSummaries.length > 0) {
    text("RESUMO POR EVENTO", margin, y, 9, "rgba(139, 92, 246, 0.6)", "600");
    y += px(16);

    // Header row
    text("Evento", margin + px(4), y, 8, "rgba(255,255,255,0.35)", "600");
    text("Entradas", W - margin - px(200), y, 8, "rgba(255,255,255,0.35)", "600");
    text("Saídas", W - margin - px(130), y, 8, "rgba(255,255,255,0.35)", "600");
    text("Líquido", W - margin - px(60), y, 8, "rgba(255,255,255,0.35)", "600");
    y += px(12);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
    y += px(10);

    eventSummaries.forEach((ev, i) => {
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fillRect(margin - px(4), y - px(10), W - margin * 2 + px(8), px(28));
      }
      const name = ev.event_name.length > 28 ? ev.event_name.slice(0, 26) + "…" : ev.event_name;
      text(name, margin + px(4), y, 11, "#ffffff", "500");
      text(fmtBRL(ev.entradas), W - margin - px(200), y, 11, "rgba(74, 222, 128, 0.9)", "500");
      text(fmtBRL(ev.saidas), W - margin - px(130), y, 11, "rgba(248, 113, 113, 0.9)", "500");
      text(fmtBRL(ev.saldo), W - margin - px(60), y, 11, ev.saldo >= 0 ? "rgba(74, 222, 128, 0.9)" : "rgba(248, 113, 113, 0.9)", "600");
      y += px(28);
    });
    y += px(10);
  }

  // Detailed entries
  if (contentType === "detalhado" && entries.length > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
    y += px(16);

    text(`LANÇAMENTOS (${entries.length})`, margin, y, 9, "rgba(139, 92, 246, 0.6)", "600");
    y += px(16);

    // Column headers
    const c = { nome: margin + px(4), tipo: margin + px(200), status: margin + px(260), valor: W - margin - px(10) };
    text("Nome", c.nome, y, 8, "rgba(255,255,255,0.35)", "600");
    text("Tipo", c.tipo, y, 8, "rgba(255,255,255,0.35)", "600");
    text("Status", c.status, y, 8, "rgba(255,255,255,0.35)", "600");
    text("Valor", c.valor, y, 8, "rgba(255,255,255,0.35)", "600", "right");
    y += px(12);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
    y += px(10);

    const sorted = [...entries].sort((a, b) => (a.data_lancamento || "").localeCompare(b.data_lancamento || ""));
    sorted.forEach((e, i) => {
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fillRect(margin - px(4), y - px(10), W - margin * 2 + px(8), px(26));
      }
      const name = e.title.length > 30 ? e.title.slice(0, 28) + "…" : e.title;
      text(name, c.nome, y, 11, "#ffffff", "500");
      text(e.type === "entrada" ? "Entrada" : "Saída", c.tipo, y, 10, "rgba(255,255,255,0.6)", "400");
      const isPaid = CONFIRMED.includes(e.status);
      text(isPaid ? "Pago" : "Pendente", c.status, y, 10, isPaid ? "rgba(74, 222, 128, 0.9)" : "rgba(250, 204, 21, 0.9)", "500");

      const sign = e.type === "entrada" ? "+" : "-";
      const valColor = e.type === "entrada" ? "rgba(74, 222, 128, 0.9)" : "rgba(248, 113, 113, 0.9)";
      text(`${sign}${fmtBRL(Number(e.amount))}`, c.valor, y, 11, valColor, "600", "right");
      y += px(26);
    });
  }

  // Footer
  y += px(10);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
  y += px(16);
  text(`Total: ${entries.length} lançamento${entries.length !== 1 ? "s" : ""}`, margin, y, 10, "rgba(255,255,255,0.3)", "400");

  // Crop canvas to actual content
  const finalH = y + px(30);
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = W;
  croppedCanvas.height = Math.min(finalH, H);
  const cCtx = croppedCanvas.getContext("2d")!;
  cCtx.drawImage(canvas, 0, 0);

  const link = document.createElement("a");
  link.download = `relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.png`;
  link.href = croppedCanvas.toDataURL("image/png");
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
