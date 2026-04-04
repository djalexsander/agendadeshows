import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getOrCreateBrowserPushSubscription,
  getPushPlatform,
  getSubscriptionPayload,
} from "@/lib/pushSubscription";

export function usePushSubscription() {
  const { user } = useAuth();
  const registeredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || registeredUserRef.current === user.id) return;
    registeredUserRef.current = user.id;

    const register = async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.log("Push notifications not supported");
          return;
        }

        const permission = Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

        if (permission !== "granted") {
          console.log("Notification permission denied");
          return;
        }

        const subscription = await getOrCreateBrowserPushSubscription();
        const payload = getSubscriptionPayload(subscription);

        const { error } = await supabase.functions.invoke("register-push-subscription", {
          body: {
            ...payload,
            platform: getPushPlatform(),
          },
        });

        if (error) {
          throw error;
        }

        console.info("Push subscription registered", {
          userId: user.id,
          endpoint: payload.endpoint.slice(-24),
        });
      } catch (err) {
        registeredUserRef.current = null;
        console.error("Push subscription error:", err);
      }
    };

    register();
  }, [user]);
}
