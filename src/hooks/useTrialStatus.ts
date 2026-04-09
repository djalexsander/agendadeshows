import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface TrialStatus {
  /** Trial is active — all modules unlocked */
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEndDate: Date | null;
  /** 2 days or less remaining in the trial */
  isTrialWarning: boolean;
  /** Trial ended */
  isTrialExpired: boolean;
  /** Grace period active (3 days after trial) — basic plan, banners shown */
  isGracePeriod: boolean;
  graceDaysLeft: number;
  /** User had a trial at some point */
  hadTrial: boolean;
}

export function useTrialStatus(): TrialStatus {
  const { profile } = useAuth();

  return useMemo(() => {
    const empty: TrialStatus = {
      isTrialActive: false, trialDaysLeft: 0, trialEndDate: null,
      isTrialWarning: false, isTrialExpired: false,
      isGracePeriod: false, graceDaysLeft: 0, hadTrial: false,
    };

    if (!profile) return empty;

    const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null;
    const graceEnd = profile.grace_ends_at ? new Date(profile.grace_ends_at) : null;
    const hadTrial = !!trialStart;
    const now = new Date();

    if (!trialEnd || !trialStart) return { ...empty, hadTrial };

    const msLeft = trialEnd.getTime() - now.getTime();
    const trialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const isTrialActive = now <= trialEnd;
    const isTrialExpired = hadTrial && !isTrialActive;
    const isTrialWarning = isTrialActive && trialDaysLeft <= 2;

    // Grace period: trial expired but still within grace window
    let isGracePeriod = false;
    let graceDaysLeft = 0;
    if (isTrialExpired && graceEnd) {
      isGracePeriod = now <= graceEnd;
      graceDaysLeft = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      isTrialActive, trialDaysLeft, trialEndDate: trialEnd,
      isTrialWarning, isTrialExpired,
      isGracePeriod, graceDaysLeft, hadTrial,
    };
  }, [profile]);
}
