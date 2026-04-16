import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Show } from "@/hooks/useSupabaseShows";

/** Export a single show as a detailed PNG card */
export function exportShowPNG(show: Show) {
  const scale = 2;
  const W = 700 * scale;
  const px = (v: number) => v * scale;
  const margin = px(50);

  // Pre-calculate height based on content
  const lines: { label: string; value: string }[] = [];
  lines.push({ label: "Cidade", value: `${show.cidade}${show.estado ? ` — ${show.estado}` : ""}` });
  if (show.local) lines.push({ label: "Local", value: show.local });
  if (show.endereco) lines.push({ label: "Endereço", value: show.endereco });
  if (show.com_quem_evento) lines.push({ label: "Com quem", value: show.com_quem_evento });
  if (show.horario) lines.push({ label: "Horário", value: show.horario });
  const statusLabel = (show.status || "pendente").charAt(0).toUpperCase() + (show.status || "pendente").slice(1);
  lines.push({ label: "Status", value: statusLabel });

  const headerH = px(120);
  const lineH = px(48);
  const footerH = px(60);
  const H = headerH + lines.length * lineH + footerH + px(30);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#1a1025");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#0c0f1a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glowGrad = ctx.createRadialGradient(W * 0.3, H * 0.1, 0, W * 0.3, H * 0.1, W * 0.5);
  glowGrad.addColorStop(0, "rgba(139, 92, 246, 0.08)");
  glowGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  const drawText = (text: string, x: number, yPos: number, size: number, color: string, weight = "400", align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${px(size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, yPos);
    ctx.textAlign = "left";
  };

  let y = px(50);

  // Title
  drawText("MINHA AGENDA", margin, y, 12, "rgba(139, 92, 246, 0.7)", "600");
  y += px(12);

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

  // Date
  const dateObj = parseISO(show.date);
  const dateFormatted = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  drawText(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1), margin, y, 20, "#ffffff", "700");
  y += px(30);

  // Separator
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = px(1);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(24);

  // Info lines
  lines.forEach((line) => {
    drawText(line.label, margin, y, 11, "rgba(139, 92, 246, 0.6)", "600");
    const valueColor = line.label === "Status"
      ? (show.status === "confirmado" ? "rgba(74, 222, 128, 0.9)" : show.status === "finalizado" ? "rgba(96, 165, 250, 0.9)" : "rgba(250, 204, 21, 0.9)")
      : "#ffffff";
    drawText(line.value, margin + px(110), y, 14, valueColor, "500");
    y += lineH;
  });

  // Footer
  y += px(10);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(20);
  drawText(`Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, margin, y, 10, "rgba(255,255,255,0.25)", "400");

  const link = document.createElement("a");
  link.download = `evento-${show.date}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/** Export multiple shows into a single PNG image */
export function exportShowsListPNG(shows: Show[], periodLabel?: string, startDate?: string, endDate?: string) {
  if (shows.length === 0) return;

  const hasAnyLocal = shows.some((s) => s.local || s.endereco);

  const scale = 2;
  const W = (hasAnyLocal ? 900 : 800) * scale;
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
  drawText("MINHA AGENDA", margin, y, 12, "rgba(139, 92, 246, 0.7)", "600");
  y += px(12);

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

  let subtitle = periodLabel || "";
  if (!periodLabel) {
    const parts: string[] = [];
    if (startDate) parts.push(`De ${format(parseISO(startDate), "dd/MM/yyyy")}`);
    if (endDate) parts.push(`${startDate ? "até" : "Até"} ${format(parseISO(endDate), "dd/MM/yyyy")}`);
    subtitle = parts.length > 0 ? parts.join(" ") : "Todos os eventos";
  }
  drawText(subtitle, margin, y, 22, "#ffffff", "700");
  y += px(14);
  drawText(`${shows.length} evento${shows.length !== 1 ? "s" : ""}`, margin, y, 13, "rgba(255,255,255,0.45)", "400");
  y += px(35);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = px(1);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(20);

  // Table columns
  const colDate = margin;
  const colDay = margin + px(90);
  const colCity = margin + px(150);
  const colLocal = hasAnyLocal ? margin + px(280) : 0;
  const colState = W - margin - px(110);
  const colStatus = W - margin - px(5);

  drawText("DATA", colDate, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  drawText("DIA", colDay, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  drawText("CIDADE", colCity, y, 9, "rgba(139, 92, 246, 0.6)", "600");
  if (hasAnyLocal) drawText("LOCAL", colLocal, y, 9, "rgba(139, 92, 246, 0.6)", "600");
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
  const truncate = (text: string, maxW: number) => {
    let t = text;
    ctx.font = `500 ${px(14)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    while (ctx.measureText(t).width > maxW && t.length > 1) {
      t = t.slice(0, -1);
    }
    return t !== text ? t + "…" : t;
  };

  shows.forEach((show, i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(margin - px(8), y - px(12), W - margin * 2 + px(16), px(rowH - 4));
    }

    const dateObj = parseISO(show.date);
    const dateStr = format(dateObj, "dd/MM/yyyy");
    const dayStr = format(dateObj, "EEE", { locale: ptBR });

    const maxCityW = (hasAnyLocal ? colLocal : colState) - colCity - px(10);
    const cityText = truncate(show.cidade, maxCityW);

    let localText = "";
    if (hasAnyLocal) {
      const raw = [show.local, show.endereco].filter(Boolean).join(" · ");
      const maxLocalW = colState - colLocal - px(10);
      localText = truncate(raw, maxLocalW);
    }

    const statusLabel = (show.status || "pendente").charAt(0).toUpperCase() + (show.status || "pendente").slice(1);
    const statusColor = show.status === "confirmado"
      ? "rgba(74, 222, 128, 0.9)"
      : show.status === "finalizado"
      ? "rgba(96, 165, 250, 0.9)"
      : "rgba(250, 204, 21, 0.9)";

    drawText(dateStr, colDate, y, 13, "rgba(255,255,255,0.8)", "400");
    drawText(dayStr, colDay, y, 13, "rgba(255,255,255,0.5)", "400");
    drawText(cityText, colCity, y, 14, "#ffffff", "500");
    if (hasAnyLocal && localText) drawText(localText, colLocal, y, 12, "rgba(255,255,255,0.55)", "400");
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

  const link = document.createElement("a");
  link.download = `agenda-eventos.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
