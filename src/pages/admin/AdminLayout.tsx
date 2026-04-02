import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Music,
  LayoutDashboard,
  CalendarDays,
  Users,
  DollarSign,
  QrCode,
  LogOut,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/admin/clients", icon: Users, label: "Clientes" },
  { to: "/admin/financial", icon: DollarSign, label: "Financeiro" },
  { to: "/admin/pix", icon: QrCode, label: "Pix" },
  { to: "/admin/settings", icon: Settings, label: "Config" },
];

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed silently
    });
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

  useEffect(() => {
    // Request notification permission and register SW
    requestNotificationPermission();
    registerServiceWorker();

    // Listen for new admin notifications in realtime
    const channel = supabase
      .channel("admin-push-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload: any) => {
          const data = payload.new;
          // Show browser notification
          showBrowserNotification(
            data.titulo || "Nova notificação",
            data.mensagem || "Você tem uma nova notificação"
          );
          // Also show in-app toast
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

  const handleEnableNotifications = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          toast({ title: "Notificações ativadas!", description: "Você receberá alertas de novos cadastros." });
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Agenda de Shows</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Painel Master</p>
          </div>
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
          {"Notification" in window && Notification.permission !== "granted" && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-muted-foreground text-xs"
              onClick={handleEnableNotifications}
            >
              <Bell className="h-4 w-4" />
              Ativar notificações
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
          <p className="text-[10px] text-muted-foreground/50 text-center">{APP_VERSION}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "p-2 rounded-lg transition-colors",
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
            <button onClick={signOut} className="p-2 text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
