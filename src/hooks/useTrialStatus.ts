import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TrialStatus {
  isOnTrial: boolean;
  trialExpired: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  hasActiveSubscription: boolean;
}

export function useTrialStatus() {
  const { profile, user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isOnTrial: false,
    trialExpired: false,
    daysRemaining: 0,
    trialEndsAt: null,
    hasActiveSubscription: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchTrialStatus = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("trial_ends_at, stripe_subscription_status")
        .eq("id", profile.organization_id)
        .maybeSingle();

      if (!org) {
        setLoading(false);
        return;
      }

      const hasActiveSubscription =
        org.stripe_subscription_status === "active" ||
        org.stripe_subscription_status === "trialing";

      if (!org.trial_ends_at) {
        // No trial set — either legacy org or already subscribed
        setTrialStatus({
          isOnTrial: false,
          trialExpired: false,
          daysRemaining: 0,
          trialEndsAt: null,
          hasActiveSubscription,
        });
      } else {
        const now = new Date();
        const trialEnd = new Date(org.trial_ends_at);
        const diffMs = trialEnd.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const trialExpired = diffMs <= 0;

        setTrialStatus({
          isOnTrial: !trialExpired && !hasActiveSubscription,
          trialExpired: trialExpired && !hasActiveSubscription,
          daysRemaining,
          trialEndsAt: org.trial_ends_at,
          hasActiveSubscription,
        });
      }
    } catch (error) {
      console.error("Error fetching trial status:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  return { trialStatus, loading, refetch: fetchTrialStatus };
}
