import { describe, it, expect } from "vitest";
import {
  isConfirmedFinancialStatus,
  isPendingFinancialStatus,
  getFinancialStatusStyle,
  CONFIRMED_FINANCIAL_STATUSES,
  FINANCIAL_STATUS_LABELS,
} from "../financialStatus";

describe("financialStatus - isConfirmedFinancialStatus", () => {
  it("aceita pago/recebido/confirmado (legado)", () => {
    expect(isConfirmedFinancialStatus("pago")).toBe(true);
    expect(isConfirmedFinancialStatus("recebido")).toBe(true);
    expect(isConfirmedFinancialStatus("confirmado")).toBe(true);
  });
  it("rejeita pendente/vencido/cancelado/null", () => {
    expect(isConfirmedFinancialStatus("pendente")).toBe(false);
    expect(isConfirmedFinancialStatus("vencido")).toBe(false);
    expect(isConfirmedFinancialStatus("cancelado")).toBe(false);
    expect(isConfirmedFinancialStatus(null)).toBe(false);
    expect(isConfirmedFinancialStatus(undefined)).toBe(false);
    expect(isConfirmedFinancialStatus("")).toBe(false);
  });
  it("CONFIRMED_FINANCIAL_STATUSES contém os 3 valores esperados", () => {
    expect(CONFIRMED_FINANCIAL_STATUSES).toEqual(["pago", "recebido", "confirmado"]);
  });
});

describe("financialStatus - isPendingFinancialStatus", () => {
  it("apenas 'pendente' conta como pendente", () => {
    expect(isPendingFinancialStatus("pendente")).toBe(true);
    expect(isPendingFinancialStatus("pago")).toBe(false);
    expect(isPendingFinancialStatus(null)).toBe(false);
  });
});

describe("financialStatus - getFinancialStatusStyle", () => {
  it("retorna estilo correto para cada status canônico", () => {
    expect(getFinancialStatusStyle("pago").label).toBe("Pago");
    expect(getFinancialStatusStyle("recebido").label).toBe("Recebido");
    expect(getFinancialStatusStyle("vencido").label).toBe("Vencido");
    expect(getFinancialStatusStyle("cancelado").label).toBe("Cancelado");
  });
  it("faz fallback para 'pendente' quando status é desconhecido", () => {
    expect(getFinancialStatusStyle("xpto")).toEqual(FINANCIAL_STATUS_LABELS.pendente);
  });
});
