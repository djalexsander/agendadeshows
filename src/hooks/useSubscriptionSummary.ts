import { useMemo } from "react";
import { useBasePlanConfig } from "@/hooks/useBasePlanConfig";
import { useModuleCatalog, type CatalogModule } from "@/hooks/useModuleCatalog";
import { useModuleRequests } from "@/hooks/useModuleRequests";
import { useClientModulePayments } from "@/hooks/useClientModulePayments";
import { useModules, type ModuleName } from "@/hooks/useModules";

export interface SubscriptionModuleItem {
  module_name: string;
  display_name: string;
  price: number;
  billing_period: string;
  /** Why this module is included: "pending_request" | "pending_payment" */
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
 * A module is included when:
 * - It has a pending module_request or pending_review module_payment
 * - AND it is NOT already active in user_modules
 *
 * Already-active modules are excluded to avoid double-charging.
 */
export function useSubscriptionSummary(): SubscriptionSummary {
  const { config, loading: configLoading } = useBasePlanConfig();
  const { modules: catalog, loading: catalogLoading } = useModuleCatalog();
  const { requests, loading: requestsLoading } = useModuleRequests();
  const { payments, loading: paymentsLoading } = useClientModulePayments();
  const { hasModule, loading: modulesLoading } = useModules();

  const loading = configLoading || catalogLoading || requestsLoading || paymentsLoading || modulesLoading;

  const summary = useMemo(() => {
    const basePrice = config?.price ?? 0;
    const basePlanName = config?.name ?? "Plano Base";
    const baseBillingPeriod = config?.billing_period ?? "monthly";

    if (loading) {
      return { basePrice, basePlanName, baseBillingPeriod, modules: [], modulesSubtotal: 0, total: basePrice, loading: true };
    }

    // Build set of module names that should be charged
    const pendingModuleNames = new Set<string>();

    // Modules with pending requests
    requests
      .filter((r) => r.status === "pending")
      .forEach((r) => pendingModuleNames.add(r.module_name));

    // Modules with pending_review payments
    payments
      .filter((p) => p.status === "pending_review")
      .forEach((p) => pendingModuleNames.add(p.module_name));

    // Remove modules already active (paid in previous cycles)
    const catalogMap = new Map<string, CatalogModule>(
      catalog.map((c) => [c.module_name, c])
    );

    const moduleItems: SubscriptionModuleItem[] = [];

    pendingModuleNames.forEach((name) => {
      // Skip if already active
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
  }, [config, catalog, requests, payments, hasModule, loading]);

  return summary;
}
