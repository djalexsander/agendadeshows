import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModules } from "@/hooks/useModules";
import { MODULE_LABELS, type ModuleName } from "@/lib/modules";

interface ModuleGateProps {
  moduleName: ModuleName;
  children: ReactNode;
  /** Replace blocked content inline instead of a full card (for small UI areas) */
  inline?: boolean;
  title?: string;
  description?: string;
}

export function ModuleGate({
  moduleName,
  children,
  inline = false,
  title,
  description,
}: ModuleGateProps) {
  const { hasModule, loading } = useModules();
  const navigate = useNavigate();

  if (loading) {
    return inline ? null : (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasModule(moduleName)) {
    return <>{children}</>;
  }

  const label = title || MODULE_LABELS[moduleName] || moduleName;
  const desc =
    description ||
    `O recurso "${label}" faz parte de um módulo adicional. Ative para liberar o acesso.`;

  if (inline) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl opacity-70"
        onClick={() => navigate("/modulos")}
      >
        <Lock className="h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col items-center text-center gap-4">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Puzzle className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
      </div>
      <Button className="rounded-xl gap-2" onClick={() => navigate("/modulos")}>
        <Lock className="h-4 w-4" />
        Ver módulos
      </Button>
    </div>
  );
}
