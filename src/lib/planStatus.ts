export type EffectivePlanStatus =
  | "trial"
  | "trial_expired"
  | "pending_payment"
  | "pending_review"
  | "active"
  | "expired"
  | "rejected"
  | "blocked"
  | "pending_plan_choice";

interface PlanProfile {
  status_plano?: string | null;
  plan_type?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  is_paid?: boolean | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

export function getEffectivePlanStatus(profile: PlanProfile | null): EffectivePlanStatus {
  if (!profile) return "blocked";

  const status = profile.status_plano;

  // Pending plan choice (just signed up)
  if (status === "pending_plan_choice") return "pending_plan_choice";

  // Rejected
  if (status === "rejeitado") return "rejected";

  // Blocked / inactive
  if (status === "inativo" || status === "blocked") return "blocked";

  // Payment under review
  if (status === "pagamento_em_analise" || status === "pending_review") return "pending_review";

  // Waiting for payment
  if (
    status === "aguardando_pagamento" ||
    status === "pendente_pagamento" ||
    status === "pendente_aprovacao" ||
    status === "pending_payment"
  ) return "pending_payment";

  // Check trial
  const planType = profile.plan_type;
  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = new Date();

  if (planType === "free_trial_7_days" && trialEndsAt) {
    if (now <= trialEndsAt) return "trial";
    // Trial expired — check if they have an active paid period
    if (profile.current_period_end && new Date(profile.current_period_end) > now && profile.is_paid) {
      return "active";
    }
    // After trial: convert to basic plan (keep access, modules limited to paid only)
    // Status "ativo" means they stay active on basic plan
    if (status === "ativo" || status === "active") return "active";
    return "trial_expired";
  }

  // Check monthly/lifetime active period
  if (status === "ativo" || status === "active") {
    // Lifetime users (legacy)
    if (planType === "lifetime" && profile.is_paid) return "active";

    // Monthly users — check period
    if (profile.current_period_end) {
      if (new Date(profile.current_period_end) > now) return "active";
      return "expired";
    }

    // Legacy active without period (admin-created users)
    if (profile.is_paid) return "active";

    // Admin-created users with status ativo (no plan_type set or 'lifetime')
    if (planType === "lifetime" || (!planType || planType === "none")) {
      // If created by admin and status is ativo, they have access
      return "active";
    }

    return "active";
  }

  // Expired plan
  if (status === "expired" || status === "vencido") return "expired";

  return "blocked";
}

export function formatBillingPeriod(period: string): string {
  switch (period) {
    case "monthly": return "/mês";
    case "yearly": return "/ano";
    case "one_time": return " único";
    default: return "";
  }
}
