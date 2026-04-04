import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getOrCreateBrowserPushSubscription,
  getCurrentBrowserPushSubscription,
  getPushPlatform,
  getSubscriptionPayload,
} from "@/lib/pushSubscription";

export function usePushSubscription() {
  const { user } = useAuth();
  const registeredUserRef = useRef<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setPushEnabled(null);
      return;
    }

    const checkStatus = async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          setPushEnabled(false);
          return;
        }
        if ("Notification" in window && Notification.permission === "denied") {
          setPushEnabled(false);
          return;
        }
        const sub = await getCurrentBrowserPushSubscription();
        if (sub) {
          const payload = getSubscriptionPayload(sub);
          const { count } = await (supabase.from("push_subscriptions") as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("endpoint", payload.endpoint);
          setPushEnabled((count ?? 0) > 0);
        } else {
          setPushEnabled(false);
        }
      } catch (err) {
        setPushEnabled(false);
      }
    };
    checkStatus();
  }, [user]);

  const enablePush = useCallback(async () => {
    if (!user) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const subscription = await getOrCreateBrowserPushSubscription();
      const payload = getSubscriptionPayload(subscription);
      const { error } = await supabase.functions.invoke("register-push-subscription", {
        body: { ...payload, platform: getPushPlatform() },
      });
      if (error) throw error;
      setPushEnabled(true);
    } catch (err) {
      console.error("Push enable error:", err);
    }
  }, [user]);

  const disablePush = useCallback(async () => {
    if (!user) return;
    try {
      const sub = await getCurrentBrowserPushSubscription();
      if (sub) {
        const payload = getSubscriptionPayload(sub);
        await (supabase.from("push_subscriptions") as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", payload.endpoint);
        await sub.unsubscribe().catch(() => undefined);
      }
      setPushEnabled(false);
    } catch (err) {
      console.error("Push disable error:", err);
    }
  }, [user]);

  const togglePush = useCallback(async () => {
    if (pushEnabled) {
      await disablePush();
    } else {
      await enablePush();
    }
  }, [pushEnabled, enablePush, disablePush]);

  return { pushEnabled, togglePush, enablePush, disablePush };
}
