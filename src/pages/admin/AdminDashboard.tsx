import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, UserCheck, UserX } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, ativos: 0, inativos: 0, pagos: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase.from("profiles").select("status_plano");
      const { data: payments } = await supabase
        .from("payments")
        .select("status")
        .eq("status", "pago");

      if (profiles) {
        setStats({
          total: profiles.length,
          ativos: profiles.filter((p) => p.status_plano === "ativo").length,
          inativos: profiles.filter((p) => p.status_plano === "inativo").length,
          pagos: payments?.length || 0,
        });
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Total de Clientes", value: stats.total, icon: Users, color: "bg-primary/15 text-primary" },
    { label: "Ativos", value: stats.ativos, icon: UserCheck, color: "bg-[hsl(140_60%_45%)]/15 text-[hsl(140_60%_55%)]" },
    { label: "Inativos", value: stats.inativos, icon: UserX, color: "bg-destructive/15 text-destructive" },
    { label: "Pagamentos Recebidos", value: stats.pagos, icon: DollarSign, color: "bg-blue-500/15 text-blue-400" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className={`h-10 w-10 rounded-xl ${card.color} flex items-center justify-center`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
