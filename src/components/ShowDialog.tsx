import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Pencil, Trash2, CalendarDays, AlertTriangle, Users, Image, Clock, Navigation, Copy, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Show, ShowStatus } from "@/hooks/useSupabaseShows";
import { exportShowPNG } from "@/lib/exportPNG";
import { toast } from "sonner";
import { RoutePickerSheet } from "./RoutePickerSheet";
import { useModules } from "@/hooks/useModules";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ESTADOS_BR = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

const STATUS_OPTIONS: { value: ShowStatus; label: string; color: string }[] = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-500" },
  { value: "confirmado", label: "Confirmado", color: "bg-[hsl(140_60%_45%)]" },
  { value: "finalizado", label: "Finalizado", color: "bg-blue-500" },
];

function buildAddressString(show: { local?: string; endereco?: string; cidade: string; estado: string }) {
  const parts: string[] = [];
  if (show.local?.trim()) parts.push(show.local.trim());
  if (show.endereco?.trim()) parts.push(show.endereco.trim());
  if (show.cidade?.trim()) parts.push(show.cidade.trim());
  if (show.estado?.trim()) parts.push(show.estado.trim());
  return parts.join(", ");
}


function copyAddress(address: string) {
  navigator.clipboard.writeText(address).then(() => {
    toast.success("Endereço copiado!");
  }).catch(() => {
    toast.error("Não foi possível copiar");
  });
}

interface ShowDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null;
  existingShow: Show | undefined;
  onSave: (date: string, cidade: string, estado: string, status: ShowStatus, comQuem?: string, horario?: string, local?: string, endereco?: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Show, "cidade" | "estado" | "status" | "com_quem_evento" | "horario" | "local" | "endereco">>) => void;
  onDelete: (id: string) => void;
}

export function ShowDialog({
  open,
  onClose,
  selectedDate,
  existingShow,
  onSave,
  onUpdate,
  onDelete,
}: ShowDialogProps) {
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [status, setStatus] = useState<ShowStatus>("pendente");
  const [comQuemEvento, setComQuemEvento] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [endereco, setEndereco] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const { hasModule } = useModules();
  const navigate = useNavigate();

  useEffect(() => {
    if (existingShow) {
      setCidade(existingShow.cidade);
      setEstado(existingShow.estado || "");
      setStatus(existingShow.status || "pendente");
      setComQuemEvento(existingShow.com_quem_evento || "");
      setHorario(existingShow.horario || "");
      setLocal(existingShow.local || "");
      setEndereco(existingShow.endereco || "");
      setIsEditing(false);
      setConfirmDelete(false);
    } else {
      setCidade("");
      setEstado("");
      setStatus("pendente");
      setComQuemEvento("");
      setHorario("");
      setLocal("");
      setEndereco("");
      setIsEditing(true);
    }
  }, [existingShow, selectedDate, open]);

  if (!selectedDate) return null;

  const dateFormatted = format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleSave = () => {
    if (!cidade.trim() || !estado) return;
    if (existingShow) {
      onUpdate(existingShow.id, {
        cidade: cidade.trim(),
        estado,
        status,
        com_quem_evento: comQuemEvento.trim() || "",
        horario: horario.trim() || "",
        local: local.trim() || "",
        endereco: endereco.trim() || "",
      });
    } else {
      onSave(selectedDate, cidade.trim(), estado, status, comQuemEvento.trim() || undefined, horario.trim() || undefined, local.trim() || undefined, endereco.trim() || undefined);
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingShow) {
      onDelete(existingShow.id);
      onClose();
    }
  };

  const handleExportPNG = () => {
    if (existingShow) {
      exportShowPNG(existingShow);
    }
  };

  const fullAddress = existingShow ? buildAddressString(existingShow) : "";
  const hasLocation = existingShow && (existingShow.cidade?.trim() || existingShow.endereco?.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            {existingShow && !isEditing ? "Detalhes do Evento" : existingShow ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground capitalize">
            {dateFormatted}
          </DialogDescription>
        </DialogHeader>

        {existingShow && !isEditing ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <span className="text-lg font-medium">
                {existingShow.cidade}
                {existingShow.estado && <span className="text-muted-foreground"> — {existingShow.estado}</span>}
              </span>
            </div>

            {existingShow.local && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="font-medium">{existingShow.local}</p>
                </div>
              </div>
            )}

            {existingShow.endereco && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p className="font-medium">{existingShow.endereco}</p>
                </div>
              </div>
            )}

            {existingShow.com_quem_evento && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Com quem será o evento</p>
                  <p className="font-medium">{existingShow.com_quem_evento}</p>
                </div>
              </div>
            )}

            {existingShow.horario && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-medium">{existingShow.horario}</p>
                </div>
              </div>
            )}

            {/* GPS / Copy buttons */}
            {hasLocation && (
              <>
                <div className="flex gap-2">
                  {hasModule("gps") ? (
                    <Button
                      onClick={() => setRoutePickerOpen(true)}
                      className="flex-1 h-11 text-sm gap-2"
                      variant="default"
                    >
                      <Navigation className="h-4 w-4" />
                      Traçar rota
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate("/modulos")}
                      className="flex-1 h-11 text-sm gap-2 opacity-70"
                      variant="outline"
                    >
                      <Lock className="h-4 w-4" />
                      Rotas / GPS
                    </Button>
                  )}
                  <Button
                    onClick={() => copyAddress(fullAddress)}
                    className="flex-1 h-11 text-sm gap-2"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar endereço
                  </Button>
                </div>
                <RoutePickerSheet
                  open={routePickerOpen}
                  onClose={() => setRoutePickerOpen(false)}
                  destination={fullAddress}
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setIsEditing(true)}
                className="flex-1 h-12 text-base gap-2"
                variant="secondary"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              {hasModule("export_png") ? (
                <Button
                  onClick={handleExportPNG}
                  className="h-12 text-base gap-2"
                  variant="outline"
                >
                  <Image className="h-4 w-4" />
                  PNG
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/modulos")}
                  className="h-12 text-base gap-2 opacity-70"
                  variant="outline"
                >
                  <Lock className="h-4 w-4" />
                  PNG
                </Button>
              )}
              {!confirmDelete ? (
                <Button
                  onClick={() => setConfirmDelete(true)}
                  className="flex-1 h-12 text-base gap-2"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              ) : (
                <Button
                  onClick={handleDelete}
                  className="flex-1 h-12 text-base gap-2 animate-pulse"
                  variant="destructive"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Confirmar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-base">Cidade</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: São Paulo, Rio de Janeiro..."
                className="h-12 text-base bg-secondary/50 border-border"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-base">Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger className="h-12 text-base bg-secondary/50 border-border">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-popover border-border">
                  {ESTADOS_BR.map((e) => (
                    <SelectItem key={e.sigla} value={e.sigla}>
                      {e.sigla} — {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="local" className="text-base">Nome do local</Label>
              <Input
                id="local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex: Arena Show, Espaço Cultural..."
                className="h-12 text-base bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco" className="text-base">Endereço</Label>
              <Input
                id="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Ex: Rua das Flores, 123"
                className="h-12 text-base bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comQuem" className="text-base">Com quem será o evento</Label>
              <Input
                id="comQuem"
                value={comQuemEvento}
                onChange={(e) => setComQuemEvento(e.target.value)}
                placeholder="Artista, empresa, contratante..."
                className="h-12 text-base bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario" className="text-base">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="h-12 text-base bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Status</Label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                      status === opt.value
                        ? `${opt.color} text-white border-transparent`
                        : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {existingShow && (
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="secondary"
                  className="flex-1 h-12 text-base"
                >
                  Cancelar
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!cidade.trim() || !estado}
                className="flex-1 h-12 text-base bg-primary hover:bg-primary/90"
              >
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
