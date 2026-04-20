import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "compact" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "full", className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Modo claro" : "Modo escuro";

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn("h-9 w-9 text-muted-foreground hover:text-foreground", className)}
        aria-label={label}
        title={label}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={toggleTheme}
      className={cn(
        "w-full justify-start gap-3 text-muted-foreground text-xs hover:text-foreground transition-base",
        className,
      )}
      aria-label={label}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {label}
    </Button>
  );
}
