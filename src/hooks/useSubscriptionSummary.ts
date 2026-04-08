import { useMemo } from "react";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";
import { useModuleCatalog, type CatalogModule } from "@/hooks/useModuleCatalog";
import { useModuleRequests } from "@/hooks/useModuleRequests";
import { useClientModulePayments } from "@/hooks/useClientModulePayments";
import { useModules, type ModuleName } from "@/hooks/useModules";
import { useTrialModuleSelections } from "@/hooks/useTrialModuleSelections";
import { useAuth } from "@/hooks/useAuth";
import { getEffectivePlanStatus } from "@/lib/planStatus";

export interface SubscriptionModuleItem {
  module_name: string;
  display_name: string;
  price: number;
  billing_period: string;
  /** Why this module is included: "trial_selection" | "pending_request" | "pending_payment" */
  reason: string;
}

export interface SubscriptionSummary {
  basePrice: number;
  basePlanName: string;
  baseBillingPeriod: string;
  modules: SubscriptionModuleItem[];
  modulesSubtotal: number;
  total: number;
  loading: boolean;
}

/**
 * Calculates consolidated subscription total:
 * base plan + pending (not-yet-active) modules.
 *
 * During trial / trial_expired / pending_plan_choice:
 *   modules come from trial_module_selections
 *
 * When plan is active:
 *   modules come from pending module_requests / module_payments
 *   (already-active modules excluded to avoid double-charging)
 */
export function useSubscriptionSummary(): SubscriptionSummary {
  const { profile } = useAuth();
  const { config, loading: configLoading } = useBasePlanConfig();
  const { modules: catalog, loading: catalogLoading } = useModuleCatalog();
  const { requests, loading: requestsLoading } = useModuleRequests();
  const { payments, loading: paymentsLoading } = useClientModulePayments();
  const { hasModule, loading: modulesLoading } = useModules();
  const { selections, loading: selectionsLoading } = useTrialModuleSelections();

  const loading =
    configLoading || catalogLoading || requestsLoading || paymentsLoading || modulesLoading || selectionsLoading;

  const summary = useMemo(() => {
    const basePrice = config?.price ?? 0;
    const basePlanName = config?.name ?? "Plano Base";
    const baseBillingPeriod = config?.billing_period ?? "monthly";

    if (loading) {
      return { basePrice, basePlanName, baseBillingPeriod, modules: [], modulesSubtotal: 0, total: basePrice, loading: true };
    }

    const catalogMap = new Map<string, CatalogModule>(
      catalog.map((c) => [c.module_name, c])
    );

    const planStatus = getEffectivePlanStatus(profile);
    const isPreSubscription =
      planStatus === "trial" ||
      planStatus === "trial_expired" ||
      planStatus === "pending_plan_choice" ||
      planStatus === "pending_payment" ||
      planStatus === "expired";

    const moduleItems: SubscriptionModuleItem[] = [];

    if (isPreSubscription) {
      // During trial / pre-subscription: use trial_module_selections
      selections.forEach((sel) => {
        const cat = catalogMap.get(sel.module_name);
        if (!cat) return;
        moduleItems.push({
          module_name: sel.module_name,
          display_name: cat.display_name,
          price: cat.price,
          billing_period: cat.billing_period,
          reason: "trial_selection",
        });
      });
    } else {
      // Active plan: use pending requests / payments (existing logic)
      const pendingModuleNames = new Set<string>();

      requests
        .filter((r) => r.status === "pending")
        .forEach((r) => pendingModuleNames.add(r.module_name));

      payments
        .filter((p) => p.status === "pending_review")
        .forEach((p) => pendingModuleNames.add(p.module_name));

      pendingModuleNames.forEach((name) => {
        if (hasModule(name as ModuleName)) return;

        const cat = catalogMap.get(name);
        if (!cat) return;

        const reason = payments.some((p) => p.module_name === name && p.status === "pending_review")
          ? "pending_payment"
          : "pending_request";

        moduleItems.push({
          module_name: name,
          display_name: cat.display_name,
          price: cat.price,
          billing_period: cat.billing_period,
          reason,
        });
      });
    }

    const modulesSubtotal = moduleItems.reduce((sum, m) => sum + m.price, 0);

    return {
      basePrice,
      basePlanName,
      baseBillingPeriod,
      modules: moduleItems,
      modulesSubtotal,
      total: basePrice + modulesSubtotal,
      loading: false,
    };
  }, [config, catalog, requests, payments, hasModule, loading, selections, profile]);

  return summary;
}
