import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Pencil, Trash2, Music } from "lucide-react";
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
import type { Show } from "@/hooks/useShows";

interface ShowDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null;
  existingShow: Show | undefined;
  onSave: (date: string, cidade: string) => void;
  onUpdate: (id: string, cidade: string) => void;
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (existingShow) {
      setCidade(existingShow.cidade);
      setIsEditing(false);
    } else {
      setCidade("");
      setIsEditing(true);
    }
  }, [existingShow, selectedDate, open]);

  if (!selectedDate) return null;

  const dateFormatted = format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleSave = () => {
    if (!cidade.trim()) return;
    if (existingShow) {
      onUpdate(existingShow.id, cidade.trim());
    } else {
      onSave(selectedDate, cidade.trim());
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingShow) {
      onDelete(existingShow.id);
      onClose();
    }
  };

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
              <span className="text-lg font-medium">{existingShow.cidade}</span>
            </div>
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
                disabled={!cidade.trim()}
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
