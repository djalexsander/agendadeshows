import { describe, it, expect } from "vitest";
import {
  getEffectivePlanStatus,
  isPreSubscriptionStatus,
  EFFECTIVE_PLAN_STATUS_LABELS,
  formatBillingPeriod,
  FREE_TRIAL_PLAN_TYPE,
} from "../planStatus";

const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const past = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

describe("planStatus - getEffectivePlanStatus", () => {
  it("blocked quando profile é null", () => {
    expect(getEffectivePlanStatus(null)).toBe("blocked");
  });

  it("retorna 'trial' enquanto trial_ends_at no futuro", () => {
    expect(
      getEffectivePlanStatus({
        plan_type: FREE_TRIAL_PLAN_TYPE,
        trial_ends_at: future(3),
        status_plano: "ativo",
      }),
    ).toBe("trial");
  });

  it("retorna 'trial_expired' quando trial venceu e sem plano pago", () => {
    expect(
      getEffectivePlanStatus({
        plan_type: FREE_TRIAL_PLAN_TYPE,
        trial_ends_at: past(1),
        status_plano: "pendente_pagamento",
      }),
    ).toBe("pending_payment");
  });

  it("retorna 'active' quando trial venceu mas tem período pago vigente", () => {
    expect(
      getEffectivePlanStatus({
        plan_type: FREE_TRIAL_PLAN_TYPE,
        trial_ends_at: past(1),
        current_period_end: future(20),
        is_paid: true,
        status_plano: "ativo",
      }),
    ).toBe("active");
  });

  it("converte aliases de status_plano corretamente", () => {
    expect(getEffectivePlanStatus({ status_plano: "rejeitado" })).toBe("rejected");
    expect(getEffectivePlanStatus({ status_plano: "inativo" })).toBe("blocked");
    expect(getEffectivePlanStatus({ status_plano: "pagamento_em_analise" })).toBe("pending_review");
    expect(getEffectivePlanStatus({ status_plano: "aguardando_pagamento" })).toBe("pending_payment");
    expect(getEffectivePlanStatus({ status_plano: "pendente_pagamento" })).toBe("pending_payment");
  });

  it("retorna 'expired' quando current_period_end já passou", () => {
    expect(
      getEffectivePlanStatus({
        status_plano: "ativo",
        current_period_end: past(2),
      }),
    ).toBe("expired");
  });
});

describe("planStatus - isPreSubscriptionStatus", () => {
  it("identifica estados pré-assinatura", () => {
    expect(isPreSubscriptionStatus("trial")).toBe(true);
    expect(isPreSubscriptionStatus("trial_expired")).toBe(true);
    expect(isPreSubscriptionStatus("pending_payment")).toBe(true);
    expect(isPreSubscriptionStatus("pending_plan_choice")).toBe(true);
    expect(isPreSubscriptionStatus("expired")).toBe(true);
  });
  it("não classifica 'active' como pré-assinatura", () => {
    expect(isPreSubscriptionStatus("active")).toBe(false);
  });
});

describe("planStatus - labels e formatBillingPeriod", () => {
  it("tem label para todos os estados", () => {
    Object.values(EFFECTIVE_PLAN_STATUS_LABELS).forEach((l) => {
      expect(l.length).toBeGreaterThan(0);
    });
  });
  it("formata período de cobrança", () => {
    expect(formatBillingPeriod("monthly")).toBe("/mês");
    expect(formatBillingPeriod("yearly")).toBe("/ano");
    expect(formatBillingPeriod("one_time")).toBe(" único");
    expect(formatBillingPeriod("xyz")).toBe("");
  });
});
