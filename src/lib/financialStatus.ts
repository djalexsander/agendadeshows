/**
 * Single source of truth for financial entry statuses.
 * Keeps Financeiro, Relatórios, exportações e drawers alinhados.
 */

export type FinancialStatus = "pendente" | "pago" | "recebido" | "vencido" | "cancelado";

/**
 * Statuses that count as "confirmed money" (entered or left the account).
 * - pago: saída efetivamente paga
 * - recebido: entrada efetivamente recebida
 * "confirmado" é mantido como sinônimo legado para entradas antigas.
 */
export const CONFIRMED_FINANCIAL_STATUSES: readonly string[] = ["pago", "recebido", "confirmado"];

export function isConfirmedFinancialStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return CONFIRMED_FINANCIAL_STATUSES.includes(status);
}

/** Status que entra no cálculo de "Pendente". */
export function isPendingFinancialStatus(status: string | null | undefined): boolean {
  return status === "pendente";
}

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, { label: string; color: string }> = {
  pendente:  { label: "Pendente",  color: "text-yellow-500 bg-yellow-500/10" },
  pago:      { label: "Pago",      color: "text-green-500 bg-green-500/10" },
  recebido:  { label: "Recebido",  color: "text-green-500 bg-green-500/10" },
  vencido:   { label: "Vencido",   color: "text-red-500 bg-red-500/10" },
  cancelado: { label: "Cancelado", color: "text-muted-foreground bg-muted" },
};

export function getFinancialStatusStyle(status: string) {
  return (
    FINANCIAL_STATUS_LABELS[status as FinancialStatus] ??
    FINANCIAL_STATUS_LABELS.pendente
  );
}
