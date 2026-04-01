import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Pencil, Trash2, Music, AlertTriangle } from "lucide-react";
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
import type { Show, ShowStatus } from "@/hooks/useShows";

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

interface ShowDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null;
  existingShow: Show | undefined;
  onSave: (date: string, cidade: string, estado: string, status: ShowStatus) => void;
  onUpdate: (id: string, updates: Partial<Pick<Show, "cidade" | "estado" | "status">>) => void;
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (existingShow) {
      setCidade(existingShow.cidade);
      setEstado(existingShow.estado || "");
      setStatus(existingShow.status || "pendente");
      setIsEditing(false);
    } else {
      setCidade("");
      setEstado("");
      setStatus("pendente");
      setIsEditing(true);
    }
  }, [existingShow, selectedDate, open]);

  if (!selectedDate) return null;

  const dateFormatted = format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleSave = () => {
    if (!cidade.trim() || !estado) return;
    if (existingShow) {
      onUpdate(existingShow.id, { cidade: cidade.trim(), estado, status });
    } else {
      onSave(selectedDate, cidade.trim(), estado, status);
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingShow) {
      onDelete(existingShow.id);
      onClose();
    }
  };

  const handleStatusChange = (newStatus: ShowStatus) => {
    setStatus(newStatus);
  };

  const handleStatusSave = () => {
    if (existingShow) {
      onUpdate(existingShow.id, { status });
      onClose();
    }
  };

  const currentStatusInfo = STATUS_OPTIONS.find((s) => s.value === (existingShow?.status || status));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Music className="h-5 w-5 text-primary" />
            {existingShow && !isEditing ? "Detalhes do Show" : existingShow ? "Editar Show" : "Novo Show"}
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

            {/* Status selector */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
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

            {status !== (existingShow.status || "pendente") && (
              <Button
                onClick={handleStatusSave}
                className="w-full h-12 text-base bg-primary hover:bg-primary/90"
              >
                Salvar Status
              </Button>
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
              <Button
                onClick={handleDelete}
                className="flex-1 h-12 text-base gap-2"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-base">
                Cidade
              </Label>
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
              <Label htmlFor="estado" className="text-base">
                Estado
              </Label>
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
