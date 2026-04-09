import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminMode } from "@/hooks/useAdminMode";
import { supabase } from "@/integrations/supabase/client";
import {
  Music,
  LayoutDashboard,
  CalendarDays,
  Users,
  UsersRound,
  CreditCard,
  DollarSign,
  QrCode,
  LogOut,
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  Puzzle,
  Tag,
  Receipt,
  Building2,
  ShieldCheck,
  FileBarChart,
  MapPin,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { useToast } from "@/hooks/use-toast";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const adminNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/admin/clients", icon: Users, label: "Clientes" },
  { to: "/admin/financial", icon: DollarSign, label: "Financeiro" },
  { to: "/admin/pix", icon: QrCode, label: "Pix" },
  { to: "/admin/base-plan", icon: CreditCard, label: "Plano Base" },
  { to: "/admin/modules", icon: Puzzle, label: "Módulos" },
  { to: "/admin/module-catalog", icon: Tag, label: "Catálogo" },
  { to: "/admin/module-payments", icon: Receipt, label: "Pgto Módulos" },
  { to: "/admin/settings", icon: Settings, label: "Config" },
];

const empresaNavItems = [
  { to: "/admin/empresa", icon: CalendarDays, label: "Agenda", end: true },
  { to: "/admin/empresa/equipe", icon: Users, label: "Equipe" },
  { to: "/admin/empresa/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/admin/empresa/relatorios", icon: FileBarChart, label: "Relatórios" },
  { to: "/admin/empresa/usuarios", icon: UsersRound, label: "Usuários" },
];

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    const options: NotificationOptions = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    };
    (options as any).vibrate = [200, 100, 200];
    new Notification(title, options);
  }
}

export default function AdminLayout() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { pushEnabled, togglePush } = usePushSubscription();
  const { mode, setMode, isEmpresaMode } = useAdminMode();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = isEmpresaMode ? empresaNavItems : adminNavItems;

  const handleModeSwitch = (newMode: "admin" | "empresa") => {
    setMode(newMode);
    if (newMode === "empresa") {
      navigate("/admin/empresa");
    } else {
      navigate("/admin");
    }
  };

  // Sync mode based on current route
  useEffect(() => {
    if (location.pathname.startsWith("/admin/empresa")) {
      if (!isEmpresaMode) setMode("empresa");
    } else {
      if (isEmpresaMode) setMode("admin");
    }
  }, [location.pathname]);

  useEffect(() => {
    requestNotificationPermission();
    registerServiceWorker();

    const channel = supabase
      .channel("admin-push-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload: any) => {
          const data = payload.new;
          showBrowserNotification(
            data.titulo || "Nova notificação",
            data.mensagem || "Você tem uma nova notificação"
          );
          toast({
            title: data.titulo || "Nova notificação",
            description: data.mensagem || "Você tem uma nova notificação",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const ModeToggle = ({ className }: { className?: string }) => (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-xl min-w-0 w-full max-w-full overflow-hidden", className)}>
      <button
        onClick={() => handleModeSwitch("admin")}
        className={cn(
          "flex flex-1 basis-0 min-w-0 items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all sm:gap-2 sm:px-3 sm:text-xs",
          !isEmpresaMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ShieldCheck className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
        <span className="min-w-0 truncate">Administração</span>
      </button>
      <button
        onClick={() => handleModeSwitch("empresa")}
        className={cn(
          "flex flex-1 basis-0 min-w-0 items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all sm:gap-2 sm:px-3 sm:text-xs",
          isEmpresaMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
        <span className="min-w-0 truncate">Minha Empresa</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full max-w-full overflow-x-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Agenda de Shows</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isEmpresaMode ? "Minha Empresa" : "Painel Master"}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-4">
          <ModeToggle />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant={pushEnabled ? "default" : "outline"}
            className="w-full justify-start gap-3 text-muted-foreground text-xs"
            onClick={togglePush}
          >
            {pushEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {pushEnabled ? "Desativar notificações" : "Ativar notificações"}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
          <p className="text-[10px] text-muted-foreground/50 text-center">{APP_VERSION}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex flex-col border-b border-border bg-card sticky top-0 z-50 w-full max-w-full overflow-x-hidden" style={{ paddingTop: 'calc(var(--safe-area-top) + 0.25rem)' }}>
          <div className="flex items-center justify-between px-3 sm:px-4 pt-3 pb-2 gap-3">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              <span className="font-bold text-base">
                {isEmpresaMode ? "Minha Empresa" : "Admin"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="h-11 w-11 flex items-center justify-center text-muted-foreground rounded-xl hover:bg-secondary/50"
                title="Atualizar"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button onClick={signOut} className="h-11 w-11 flex items-center justify-center text-muted-foreground rounded-xl hover:bg-secondary/50">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* Mode toggle mobile */}
          <div className="px-3 sm:px-4 pb-2">
            <ModeToggle className="w-full" />
          </div>
          {/* Nav items */}
          <div className="flex items-center justify-between gap-1.5 px-3 sm:px-4 pb-3 w-full max-w-full">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "h-11 w-11 flex items-center justify-center rounded-xl transition-colors flex-shrink-0",
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary/50"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
