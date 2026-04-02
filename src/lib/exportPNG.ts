import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Show } from "@/hooks/useSupabaseShows";

export function exportShowPNG(show: Show) {
  const scale = 2;
  const W = 800 * scale;
  const H = 1130 * scale;

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
  const glowGrad = ctx.createRadialGradient(W * 0.3, H * 0.15, 0, W * 0.3, H * 0.15, W * 0.5);
  glowGrad.addColorStop(0, "rgba(139, 92, 246, 0.08)");
  glowGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  const px = (v: number) => v * scale;
  const margin = px(60);
  let y = px(80);

  // Helper: draw text
  const drawText = (text: string, x: number, yPos: number, size: number, color: string, weight = "400", align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${px(size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, yPos);
    ctx.textAlign = "left";
  };

  // Top label
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
  y += px(50);

  // Date big
  const dateObj = parseISO(show.date);
  const dayNum = format(dateObj, "dd");
  const monthName = format(dateObj, "MMMM", { locale: ptBR });
  const year = format(dateObj, "yyyy");
  const dayOfWeek = format(dateObj, "EEEE", { locale: ptBR });

  drawText(dayNum, margin, y + px(60), 80, "#ffffff", "700");
  const dayWidth = ctx.measureText(dayNum).width;
  drawText(monthName.toUpperCase(), margin + dayWidth + px(16), y + px(28), 22, "rgba(255,255,255,0.6)", "400");
  drawText(year, margin + dayWidth + px(16), y + px(56), 18, "rgba(255,255,255,0.4)", "300");
  y += px(80);

  drawText(dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1), margin, y, 16, "rgba(139, 92, 246, 0.8)", "500");
  y += px(50);

  // Separator
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = px(1);
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(40);

  // Info rows
  const fields: { label: string; value: string | undefined }[] = [
    { label: "Cidade", value: show.cidade },
    { label: "Estado", value: show.estado },
    { label: "Com quem será o evento", value: show.com_quem_evento },
    { label: "Evento", value: show.evento },
    { label: "Local", value: show.local },
    { label: "Horário", value: show.horario },
    { label: "Status", value: show.status ? show.status.charAt(0).toUpperCase() + show.status.slice(1) : undefined },
    { label: "Observações", value: show.observacoes },
  ];

  for (const field of fields) {
    if (!field.value) continue;

    drawText(field.label.toUpperCase(), margin, y, 10, "rgba(139, 92, 246, 0.6)", "600");
    y += px(22);
    drawText(field.value, margin, y, 18, "#ffffff", "500");
    y += px(40);
  }

  // Bottom separator
  y = H - px(80);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += px(30);

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
  link.download = `evento-${show.date}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
