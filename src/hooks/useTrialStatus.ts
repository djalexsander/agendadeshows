import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface TrialStatus {
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEndDate: Date | null;
  isTrialWarning: boolean; // 2 days or less remaining
  isTrialExpired: boolean;
  hadTrial: boolean;
}

export function useTrialStatus(): TrialStatus {
  const { profile } = useAuth();

  return useMemo(() => {
    if (!profile) {
      return { isTrialActive: false, trialDaysLeft: 0, trialEndDate: null, isTrialWarning: false, isTrialExpired: false, hadTrial: false };
    }

    const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null;
    const hadTrial = !!trialStart;
    const now = new Date();

    if (!trialEnd || !trialStart) {
      return { isTrialActive: false, trialDaysLeft: 0, trialEndDate: null, isTrialWarning: false, isTrialExpired: false, hadTrial };
    }

    const msLeft = trialEnd.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const isTrialActive = now <= trialEnd;
    const isTrialExpired = hadTrial && !isTrialActive;
    const isTrialWarning = isTrialActive && daysLeft <= 2;

    return {
      isTrialActive,
      trialDaysLeft: daysLeft,
      trialEndDate: trialEnd,
      isTrialWarning,
      isTrialExpired,
      hadTrial,
    };
  }, [profile]);
}
