import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Show } from "@/hooks/useSupabaseShows";

/** Export a single show as PNG (kept for backwards compat) */
export function exportShowPNG(show: Show) {
  exportShowsListPNG([show]);
}

/** Export multiple shows into a single PNG image */
export function exportShowsListPNG(shows: Show[], periodLabel?: string, startDate?: string, endDate?: string) {
  if (shows.length === 0) return;

  const scale = 2;
  const W = 800 * scale;
  const rowH = 52;
  const headerH = 180;
  const footerH = 60;
  const estimatedH = headerH + shows.length * rowH + footerH + 40;
  const H = Math.max(600, estimatedH) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#1a1025");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#0c0f1a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle accent glow
  const glowGrad = ctx.createRadialGradient(W * 0.3, H * 0.1, 0, W * 0.3, H * 0.1, W * 0.5);
  glowGrad.addColorStop(0, "rgba(139, 92, 246, 0.08)");
  glowGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  const px = (v: number) => v * scale;
  const margin = px(50);
  let y = px(50);

  const drawText = (text: string, x: number, yPos: number, size: number, color: string, weight = "400", align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${px(size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, yPos);
    ctx.textAlign = "left";
  };

  // Title
  drawText("AGENDA DE SHOWS", margin, y, 12, "rgba(139, 92, 246, 0.7)", "600");
  y += px(12);

  // Decorative line
  const lineGrad = ctx.createLinearGradient(margin, y, margin + px(100), y);
  lineGrad.addColorStop(0, "#8b5cf6");
  lineGrad.addColorStop(1, "transparent");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = px(2);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(margin + px(100), y);
  ctx.stroke();
  y += px(35);

  // Period subtitle
  let subtitle = periodLabel || "";
  if (!periodLabel) {
    const parts: string[] = [];
    if (startDate) parts.push(`De ${format(parseISO(startDate), "dd/MM/yyyy")}`);
    if (endDate) parts.push(`${startDate ? "até" : "Até"} ${format(parseISO(endDate), "dd/MM/yyyy")}`);
    subtitle = parts.length > 0 ? parts.join(" ") : "Todos os shows";
  }
  drawText(subtitle, margin, y, 22, "#ffffff", "700");
  y += px(14);
  drawText(`${shows.length} show${shows.length !== 1 ? "s" : ""}`, margin, y, 13, "rgba(255,255,255,0.45)", "400");
  y += px(35);

  // Separator
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = px(1);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(20);

  // Table header
  const colDate = margin;
  const colDay = margin + px(90);
  const colCity = margin + px(150);
  const colState = W - margin - px(110);
  const colStatus = W - margin - px(5);

  drawText("DATA", colDate, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  drawText("DIA", colDay, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  drawText("CIDADE", colCity, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  drawText("UF", colState, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  drawText("STATUS", colStatus, y, 9, "rgba(139, 92, 246, 0.6)", "600", "right");
  y += px(18);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(14);

  // Rows
  shows.forEach((show, i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(margin - px(8), y - px(12), W - margin * 2 + px(16), px(rowH - 4));
    }

    const dateObj = parseISO(show.date);
    const dateStr = format(dateObj, "dd/MM/yyyy");
    const dayStr = format(dateObj, "EEE", { locale: ptBR });

    // Truncate city name
    let cityText = show.cidade;
    ctx.font = `500 ${px(14)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const maxCityW = colState - colCity - px(10);
    while (ctx.measureText(cityText).width > maxCityW && cityText.length > 1) {
      cityText = cityText.slice(0, -1);
    }
    if (cityText !== show.cidade) cityText += "…";

    const statusLabel = (show.status || "pendente").charAt(0).toUpperCase() + (show.status || "pendente").slice(1);
    const statusColor = show.status === "confirmado"
      ? "rgba(74, 222, 128, 0.9)"
      : show.status === "finalizado"
      ? "rgba(96, 165, 250, 0.9)"
      : "rgba(250, 204, 21, 0.9)";

    drawText(dateStr, colDate, y, 13, "rgba(255,255,255,0.8)", "400");
    drawText(dayStr, colDay, y, 13, "rgba(255,255,255,0.5)", "400");
    drawText(cityText, colCity, y, 14, "#ffffff", "500");
    drawText(show.estado || "", colState, y, 13, "rgba(255,255,255,0.6)", "400");
    drawText(statusLabel, colStatus, y, 11, statusColor, "600", "right");

    y += px(rowH);
  });

  // Footer
  y += px(10);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(20);

  drawText(
    `Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
    margin,
    y,
    10,
    "rgba(255,255,255,0.25)",
    "400"
  );

  // Download
  const link = document.createElement("a");
  link.download = `agenda-shows.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
