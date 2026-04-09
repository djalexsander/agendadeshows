import { useState } from "react";
import { ArrowLeft, DollarSign, Plus, TrendingUp, TrendingDown, Wallet, Trash2, Loader2, Filter, X, CalendarIcon, Upload, AlertCircle, Music, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ModuleGate } from "@/components/modules/ModuleGate";
import { useFinancialEntries, FinancialFilters } from "@/hooks/useFinancialEntries";
import { useSupabaseShows } from "@/hooks/useSupabaseShows";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIAS_ENTRADA = [
  "Cachê do show",
  "Sinal",
  "Pagamento final",
  "Reembolso",
  "Outros recebimentos",
];

const CATEGORIAS_SAIDA = [
  "Pedágio",
  "Combustível",
  "Alimentação",
  "Hospedagem",
  "Estacionamento",
  "Transporte",
  "Frete",
  "Equipe",
  "Manutenção",
  "Aluguel de equipamento",
  "Imprevistos",
  "Outros",
];

const FORMAS_PAGAMENTO = ["PIX", "Dinheiro", "Cartão", "Boleto", "Transferência"];

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

interface FormState {
  title: string;
  type: string;
  amount: string;
  notes: string;
  data_lancamento: Date | undefined;
  data_vencimento: Date | undefined;
  data_pagamento: Date | undefined;
  categoria: string;
  forma_pagamento: string;
  status: string;
  pessoa: string;
  show_id: string;
  parcelas: string;
  recorrencia: string;
}

const defaultForm: FormState = {
  title: "",
  type: "saida",
  amount: "",
  notes: "",
  data_lancamento: new Date(),
  data_vencimento: undefined,
  data_pagamento: undefined,
  categoria: "",
  forma_pagamento: "",
  status: "pendente",
  pessoa: "",
  show_id: "",
  parcelas: "1",
  recorrencia: "nenhuma",
};

function DatePickerField({ label, value, onChange, required }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</Label>
      <div className="flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal h-10", !value && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {value && !required && (
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => onChange(undefined)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FinanceiroContent() {
  const { user } = useAuth();
  const { entries, loading, addEntry, updateEntry, deleteEntry, totals, filters, setFilters, categories, eventSummaries } = useFinancialEntries();
  const { shows } = useSupabaseShows();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEventSummaries, setShowEventSummaries] = useState(false);
  const [form, setForm] = useState<FormState>({ ...defaultForm });
  const [uploading, setUploading] = useState(false);
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "events">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  const currentCategories = form.type === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const allFilterCategories = [...new Set([...CATEGORIAS_ENTRADA, ...CATEGORIAS_SAIDA, ...categories])];

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "");
    if (!cleaned) { setForm((f) => ({ ...f, amount: "" })); return; }
    const val = (parseInt(cleaned) / 100).toFixed(2);
    setForm((f) => ({ ...f, amount: val }));
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/financeiro/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("comprovantes").upload(path, file);
    if (error) { toast.error("Erro ao enviar comprovante"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("comprovantes").getPublicUrl(path);
    setComprovante(urlData.publicUrl);
    setUploading(false);
    toast.success("Comprovante enviado!");
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Preencha o título"); return; }
    if (!form.amount) { toast.error("Preencha o valor"); return; }
    if (!form.data_lancamento) { toast.error("Selecione a data do lançamento"); return; }
    setSaving(true);

    const selectedShow = form.show_id ? shows.find((s) => s.id === form.show_id) : null;
    const payload = {
      title: form.title,
      type: form.type,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
      data_lancamento: format(form.data_lancamento!, "yyyy-MM-dd"),
      data_vencimento: form.data_vencimento ? format(form.data_vencimento, "yyyy-MM-dd") : null,
      data_pagamento: form.data_pagamento ? format(form.data_pagamento, "yyyy-MM-dd") : null,
      categoria: form.categoria || null,
      forma_pagamento: form.forma_pagamento || null,
      status: form.status,
      pessoa: form.pessoa || null,
      comprovante_url: comprovante || null,
      recorrencia: form.recorrencia,
      show_id: form.show_id || null,
      event_name: selectedShow ? (selectedShow.evento || selectedShow.cidade) : null,
      event_date: selectedShow ? selectedShow.date : null,
    };

    if (editingId) {
      const res = await updateEntry(editingId, payload);
      if (res.error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Lançamento atualizado!");
    } else {
      const parcelas = parseInt(form.parcelas) || 1;
      for (let i = 0; i < parcelas; i++) {
        const suffix = parcelas > 1 ? ` (${i + 1}/${parcelas})` : "";
        const res = await addEntry({
          ...payload,
          title: form.title + suffix,
          parcelas,
          parcela_atual: i + 1,
        });
        if (res.error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      }
      toast.success(parcelas > 1 ? `${parcelas} parcelas adicionadas!` : "Lançamento adicionado!");
    }

    setSaving(false);
    setForm({ ...defaultForm });
    setComprovante(null);
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleEdit = (e: typeof entries[0]) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      type: e.type,
      amount: String(e.amount),
      notes: e.notes || "",
      data_lancamento: e.data_lancamento ? new Date(e.data_lancamento + "T12:00:00") : undefined,
      data_vencimento: e.data_vencimento ? new Date(e.data_vencimento + "T12:00:00") : undefined,
      data_pagamento: e.data_pagamento ? new Date(e.data_pagamento + "T12:00:00") : undefined,
      categoria: e.categoria || "",
      forma_pagamento: e.forma_pagamento || "",
      status: e.status,
      pessoa: e.pessoa || "",
      show_id: e.show_id || "",
      parcelas: String(e.parcelas),
      recorrencia: e.recorrencia,
    });
    setComprovante(e.comprovante_url || null);
    setDialogOpen(true);
  };

  const handleNewEntry = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setComprovante(null);
    setDialogOpen(true);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const activeFilters = Object.values(filters).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-card border border-border p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          </div>
          <div className="min-w-0 w-full">
            <p className="text-xs sm:text-lg font-bold text-green-500 truncate">{fmt(totals.entradas)}</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground">Entradas</p>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
          </div>
          <div className="min-w-0 w-full">
            <p className="text-xs sm:text-lg font-bold text-red-500 truncate">{fmt(totals.saidas)}</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground">Saídas</p>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 w-full">
            <p className={`text-xs sm:text-lg font-bold truncate ${totals.saldo >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(totals.saldo)}</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground">Saldo</p>
          </div>
        </div>
      </div>

      {/* Event summaries toggle */}
      {eventSummaries.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl text-xs gap-2 justify-between"
            onClick={() => setShowEventSummaries(!showEventSummaries)}
          >
            <span className="flex items-center gap-2">
              <Music className="h-3.5 w-3.5 text-primary" />
              Resumo por evento ({eventSummaries.length})
            </span>
            {showEventSummaries ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          {showEventSummaries && (
            <div className="space-y-2">
              {eventSummaries.map((ev) => (
                <div
                  key={ev.show_id}
                  className="rounded-xl bg-card border border-border p-3 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setFilters({ ...filters, show_id: filters.show_id === ev.show_id ? undefined : ev.show_id })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{ev.event_name}</span>
                      {ev.event_date && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yy")}
                        </span>
                      )}
                    </div>
                    {filters.show_id === ev.show_id && (
                      <Badge variant="default" className="text-[10px] shrink-0">Filtrado</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Entradas</span>
                      <p className="font-bold text-green-500">{fmt(ev.entradas)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Saídas</span>
                      <p className="font-bold text-red-500">{fmt(ev.saidas)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Líquido</span>
                      <p className={`font-bold ${ev.saldo >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(ev.saldo)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant={showFilters ? "default" : "outline"}
            className="rounded-xl text-xs gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilters > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilters}</Badge>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setFilters({})}>
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
        <Button size="sm" className="rounded-xl gap-1.5" onClick={handleNewEntry}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl bg-card border border-border p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filters.type || "all"} onValueChange={(v) => setFilters({ ...filters, type: v === "all" ? undefined : v as any })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Evento</Label>
              <Select value={filters.show_id || "all"} onValueChange={(v) => setFilters({ ...filters, show_id: v === "all" ? undefined : v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {shows.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.evento || s.cidade} — {format(new Date(s.date + "T12:00:00"), "dd/MM/yy")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={filters.categoria || "all"} onValueChange={(v) => setFilters({ ...filters, categoria: v === "all" ? undefined : v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {allFilterCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Período</Label>
              <div className="flex gap-1">
                <Input type="date" className="h-9 text-xs flex-1 min-w-0" value={filters.periodoInicio || ""} onChange={(e) => setFilters({ ...filters, periodoInicio: e.target.value || undefined })} />
                <Input type="date" className="h-9 text-xs flex-1 min-w-0" value={filters.periodoFim || ""} onChange={(e) => setFilters({ ...filters, periodoFim: e.target.value || undefined })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
            <DollarSign className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const st = getStatusStyle(e.status);
            const isOverdue = e.status === "vencido" || (e.status === "pendente" && e.data_vencimento && e.data_vencimento < new Date().toISOString().slice(0, 10));
            return (
              <div key={e.id} className={cn("rounded-xl bg-secondary/40 border p-3 sm:p-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3", isOverdue ? "border-red-500/40" : "border-border/50")}>
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0 ${e.type === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                    {e.type === "entrada" ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0 sm:hidden">
                    <p className="font-medium text-foreground text-sm truncate">{e.title}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 sm:hidden ${e.type === "entrada" ? "text-green-500" : "text-red-500"}`}>
                    {e.type === "entrada" ? "+" : "-"}{fmt(Number(e.amount))}
                  </span>
                </div>
                <div className="flex-1 min-w-0 hidden sm:block">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm truncate">{e.title}</p>
                    {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {e.event_name && (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Music className="h-2.5 w-2.5" />{e.event_name}
                      </span>
                    )}
                    {e.categoria && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{e.categoria}</span>}
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border-0", st.color)}>{st.label}</Badge>
                    {e.data_lancamento && <span className="text-[10px] text-muted-foreground">{format(new Date(e.data_lancamento + "T12:00:00"), "dd/MM/yy")}</span>}
                  </div>
                </div>
                {/* Mobile detail row */}
                <div className="flex items-center gap-2 flex-wrap sm:hidden">
                  {e.event_name && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Music className="h-2.5 w-2.5" />{e.event_name}
                    </span>
                  )}
                  {e.categoria && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{e.categoria}</span>}
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border-0", st.color)}>{st.label}</Badge>
                  {e.data_lancamento && <span className="text-[10px] text-muted-foreground">{format(new Date(e.data_lancamento + "T12:00:00"), "dd/MM/yy")}</span>}
                  <div className="flex items-center gap-0.5 ml-auto shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(e)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 hidden sm:block ${e.type === "entrada" ? "text-green-500" : "text-red-500"}`}>
                  {e.type === "entrada" ? "+" : "-"}{fmt(Number(e.amount))}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hidden sm:flex" onClick={() => handleEdit(e)}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hidden sm:flex" onClick={() => deleteEntry(e.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog - Novo Lançamento */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setEditingId(null); setForm({ ...defaultForm }); setComprovante(null); } setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {editingId ? "Editar lançamento" : "Novo lançamento"}
            </DialogTitle>
            <DialogDescription>Vincule ao evento para controle completo por show</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Evento */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evento</p>
              <div>
                <Label className="text-xs">Vincular a um evento</Label>
                <Select value={form.show_id || "none"} onValueChange={(v) => setForm({ ...form, show_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar evento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {shows.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.evento || s.cidade} — {format(new Date(s.date + "T12:00:00"), "dd/MM/yy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Informações principais */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, categoria: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={form.categoria || "none"} onValueChange={(v) => setForm({ ...form, categoria: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {currentCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.type === "entrada" ? "Ex: Cachê do show" : "Ex: Pedágio ida e volta"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valor (R$) *</Label>
                  <Input
                    value={form.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Datas */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datas</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DatePickerField label="Data do lançamento" value={form.data_lancamento} onChange={(d) => setForm({ ...form, data_lancamento: d })} required />
                <DatePickerField label="Vencimento" value={form.data_vencimento} onChange={(d) => setForm({ ...form, data_vencimento: d })} />
                <DatePickerField label="Pagamento" value={form.data_pagamento} onChange={(d) => setForm({ ...form, data_pagamento: d })} />
              </div>
            </div>

            <Separator />

            {/* Pagamento e detalhes */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Forma de pagamento</Label>
                  <Select value={form.forma_pagamento || "none"} onValueChange={(v) => setForm({ ...form, forma_pagamento: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Parcelas</Label>
                  <Select value={form.parcelas} onValueChange={(v) => setForm({ ...form, parcelas: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n === 1 ? "À vista" : `${n}x`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Extras */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalhes</p>
              <div>
                <Label className="text-xs">Pessoa / Cliente</Label>
                <Input value={form.pessoa} onChange={(e) => setForm({ ...form, pessoa: e.target.value })} placeholder="Nome (opcional)" />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações" rows={2} />
              </div>
              <div>
                <Label className="text-xs">Comprovante</Label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:bg-secondary/50 transition text-sm text-muted-foreground">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {comprovante ? "Enviado ✓" : "Enviar arquivo"}
                    </div>
                  </label>
                  {comprovante && (
                    <Button variant="ghost" size="sm" className="text-xs text-red-500" onClick={() => setComprovante(null)}>Remover</Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <Button className="w-full h-12 gap-2" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : parseInt(form.parcelas) > 1 ? `Adicionar ${form.parcelas} parcelas` : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Financeiro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Financeiro</h1>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-10 space-y-4">
        <ModuleGate moduleName="financeiro">
          <FinanceiroContent />
        </ModuleGate>
      </div>
    </div>
  );
}
