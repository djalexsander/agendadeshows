import { useState, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Search, Music, X, FileText, Image, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { FinancialEntry, EventSummary } from "@/hooks/useFinancialEntries";
import { exportFinancialPDF } from "@/lib/exportFinancialPDF";
import { exportFinancialPNG } from "@/lib/exportFinancialPNG";

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "text-yellow-500 bg-yellow-500/10" },
  { value: "pago", label: "Pago", color: "text-green-500 bg-green-500/10" },
  { value: "recebido", label: "Recebido", color: "text-green-500 bg-green-500/10" },
  { value: "vencido", label: "Vencido", color: "text-red-500 bg-red-500/10" },
  { value: "cancelado", label: "Cancelado", color: "text-muted-foreground bg-muted" },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

export type DetailDrawerType = "entradas" | "saidas" | "pendentes" | "saldo" | null;

interface Props {
  type: DetailDrawerType;
  onClose: () => void;
  entries: FinancialEntry[];
  categories: string[];
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CONFIRMED_STATUSES = ["pago", "recebido", "confirmado"];

export function FinancialDetailDrawer({ type, onClose, entries, categories }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterPeriodoInicio, setFilterPeriodoInicio] = useState("");
  const [filterPeriodoFim, setFilterPeriodoFim] = useState("");

  const baseList = useMemo(() => {
    if (!type) return [];
    switch (type) {
      case "entradas":
        return entries.filter((e) => e.type === "entrada");
      case "saidas":
        return entries.filter((e) => e.type === "saida");
      case "pendentes":
        return entries.filter((e) => e.status === "pendente");
      case "saldo":
        return entries.filter((e) => CONFIRMED_STATUSES.includes(e.status));
    }
  }, [type, entries]);

  const filtered = useMemo(() => {
    return baseList.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !(e.event_name || "").toLowerCase().includes(q) && !(e.pessoa || "").toLowerCase().includes(q)) return false;
      }
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterCategoria !== "all" && e.categoria !== filterCategoria) return false;
      if (filterPeriodoInicio) {
        const d = e.data_lancamento || e.created_at.slice(0, 10);
        if (d < filterPeriodoInicio) return false;
      }
      if (filterPeriodoFim) {
        const d = e.data_lancamento || e.created_at.slice(0, 10);
        if (d > filterPeriodoFim) return false;
      }
      return true;
    });
  }, [baseList, search, filterStatus, filterCategoria, filterPeriodoInicio, filterPeriodoFim]);

  const summary = useMemo(() => {
    const ent = filtered.filter((e) => e.type === "entrada").reduce((s, e) => s + Number(e.amount), 0);
    const sai = filtered.filter((e) => e.type === "saida").reduce((s, e) => s + Number(e.amount), 0);
    return { entradas: ent, saidas: sai, saldo: ent - sai, total: ent + sai };
  }, [filtered]);

  const titleMap: Record<string, string> = {
    entradas: "Entradas",
    saidas: "Saídas",
    pendentes: "Pendentes",
    saldo: "Saldo Confirmado",
  };

  const colorMap: Record<string, string> = {
    entradas: "text-green-500",
    saidas: "text-red-500",
    pendentes: "text-yellow-500",
    saldo: "text-primary",
  };

  return (
    <Drawer open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className={colorMap[type || "entradas"]}>
            {titleMap[type || "entradas"]}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto space-y-3">
          {/* Summary */}
          {type === "saldo" ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-green-500/10 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-sm font-bold text-green-500">{fmt(summary.entradas)}</p>
              </div>
              <div className="rounded-xl bg-red-500/10 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-sm font-bold text-red-500">{fmt(summary.saidas)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-sm font-bold ${summary.saldo >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(summary.saldo)}</p>
              </div>
            </div>
          ) : type === "pendentes" ? (
            <div className="rounded-xl bg-yellow-500/10 p-3 text-center">
              <p className="text-xs text-muted-foreground">Total pendente</p>
              <p className="text-lg font-bold text-yellow-500">{fmt(summary.entradas + summary.saidas)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {fmt(summary.entradas)} entradas · {fmt(summary.saidas)} saídas
              </p>
            </div>
          ) : (
            <div className={`rounded-xl p-3 text-center ${type === "entradas" ? "bg-green-500/10" : "bg-red-500/10"}`}>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className={`text-lg font-bold ${type === "entradas" ? "text-green-500" : "text-red-500"}`}>
                {fmt(type === "entradas" ? summary.entradas : summary.saidas)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{filtered.length} lançamento(s)</p>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, evento, pessoa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2">
            {type !== "pendentes" && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" className="h-8 text-xs" placeholder="De" value={filterPeriodoInicio} onChange={(e) => setFilterPeriodoInicio(e.target.value)} />
            <Input type="date" className="h-8 text-xs" placeholder="Até" value={filterPeriodoFim} onChange={(e) => setFilterPeriodoFim(e.target.value)} />
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhum lançamento encontrado</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => {
                const st = getStatusStyle(e.status);
                return (
                  <div key={e.id} className="rounded-xl bg-secondary/40 border border-border/50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${e.type === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                        {e.type === "entrada" ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                      <p className="font-medium text-sm truncate flex-1">{e.title}</p>
                      <span className={`text-sm font-bold shrink-0 ${e.type === "entrada" ? "text-green-500" : "text-red-500"}`}>
                        {e.type === "entrada" ? "+" : "-"}{fmt(Number(e.amount))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {e.event_name && (
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Music className="h-2.5 w-2.5" />{e.event_name}
                        </span>
                      )}
                      {e.categoria && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{e.categoria}</span>}
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${st.color}`}>{st.label}</Badge>
                      {e.data_lancamento && <span className="text-[10px] text-muted-foreground">{format(new Date(e.data_lancamento + "T12:00:00"), "dd/MM/yy")}</span>}
                      {e.pessoa && <span className="text-[10px] text-muted-foreground">· {e.pessoa}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
