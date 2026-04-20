import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminMode } from "@/hooks/useAdminMode";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays,
  LayoutDashboard,
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
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { useToast } from "@/hooks/use-toast";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = isEmpresaMode ? empresaNavItems : adminNavItems;

  const handleModeSwitch = (newMode: "admin" | "empresa") => {
    setMode(newMode);
    if (newMode === "empresa") {
      navigate("/admin/empresa");
    } else {
      navigate("/admin");
    }
    setMobileOpen(false);
  };

  // Sync mode based on current route
  useEffect(() => {
    if (location.pathname.startsWith("/admin/empresa")) {
      if (!isEmpresaMode) setMode("empresa");
    } else {
      if (isEmpresaMode) setMode("admin");
    }
  }, [location.pathname, isEmpresaMode, setMode]);

  // Auto-close mobile drawer on route change (modern app UX)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    requestNotificationPermission();
    registerServiceWorker();

    const loadUnread = async () => {
      const { count } = await (supabase.from("admin_notifications") as any)
        .select("id", { count: "exact", head: true })
        .eq("lida", false);
      setUnreadCount(count || 0);
    };
    loadUnread();

    const channel = supabase
      .channel("admin-push-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
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
          loadUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const ModeToggle = ({ className }: { className?: string }) => (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-xl", className)}>
      <button
        onClick={() => handleModeSwitch("admin")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center",
          !isEmpresaMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Administração
      </button>
      <button
        onClick={() => handleModeSwitch("empresa")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center",
          isEmpresaMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="h-3.5 w-3.5" />
        Minha Empresa
      </button>
    </div>
  );

  const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3 border-b border-border shrink-0">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">Minha Agenda</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {isEmpresaMode ? "Minha Empresa" : "Painel Master"}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 shrink-0">
        <ModeToggle />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
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

      <div className="p-4 border-t border-border space-y-2 shrink-0">
        <ThemeToggle />
        <Button
          variant={pushEnabled ? "default" : "outline"}
          className="w-full justify-start gap-3 text-muted-foreground text-xs relative"
          onClick={togglePush}
        >
          {pushEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {pushEnabled ? "Desativar notificações" : "Ativar notificações"}
          {unreadCount > 0 && !isEmpresaMode && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-500 text-[10px] font-bold text-background tabular-nums shadow-sm shadow-yellow-500/40">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
        <p className="text-[10px] text-muted-foreground/50 text-center">{APP_VERSION}</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar — fixed, full height, independent scroll */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex shrink-0 h-screen sticky top-0">
        <SidebarBody />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b border-border bg-card sticky top-0 z-40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 -ml-2 text-foreground rounded-lg hover:bg-secondary/50"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-card border-r border-border">
                <SidebarBody onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm">
                {isEmpresaMode ? "Minha Empresa" : "Admin"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle variant="compact" />
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-muted-foreground rounded-lg hover:bg-secondary/50"
              title="Atualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button onClick={signOut} className="p-2 text-muted-foreground rounded-lg hover:bg-secondary/50" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
