import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface UseCheckoutOptions {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: (message: string) => void;
}

// Load Snap.js dynamically with client key from edge function
let snapLoaded = false;
let snapLoadPromise: Promise<void> | null = null;

async function loadSnapJs(): Promise<void> {
  if (snapLoaded) return;
  if (snapLoadPromise) return snapLoadPromise;

  snapLoadPromise = (async () => {
    // Fetch client key from edge function
    const { data, error } = await supabase.functions.invoke("get-midtrans-client-key");
    if (error || !data?.client_key) {
      throw new Error("Failed to load payment configuration");
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://app.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", data.client_key);
      script.onload = () => {
        snapLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load payment system"));
      document.head.appendChild(script);
    });
  })();

  return snapLoadPromise;
}

export function useCheckout(options?: UseCheckoutOptions) {
  const [loading, setLoading] = useState(false);

  // Pre-load Snap.js when hook is used
  useEffect(() => {
    loadSnapJs().catch(console.error);
  }, []);

  const checkout = async (planTier: string, billingCycle: "monthly" | "yearly") => {
    setLoading(true);
    try {
      await loadSnapJs();

      const { data, error } = await supabase.functions.invoke("create-snap-token", {
        body: { plan_tier: planTier, billing_cycle: billingCycle },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { token } = data;

      if (!window.snap) {
        throw new Error("Payment system is loading. Please try again in a moment.");
      }

      window.snap.pay(token, {
        onSuccess: async (result: any) => {
          console.log("Payment success:", result);
          toast.success("Payment successful! Your plan has been upgraded.");
          // Verify payment on backend to update org subscription status
          try {
            await supabase.functions.invoke("verify-payment", {
              body: { order_id: result?.order_id || data?.order_id },
            });
          } catch (verifyErr) {
            console.error("Post-payment verification error:", verifyErr);
          }
          options?.onSuccess?.();
        },
        onPending: async (result: any) => {
          console.log("Payment pending:", result);
          toast.info("Payment is being processed. We'll update your plan once confirmed.");
          try {
            await supabase.functions.invoke("verify-payment", {
              body: { order_id: result?.order_id || data?.order_id },
            });
          } catch (verifyErr) {
            console.error("Post-payment verification error:", verifyErr);
          }
          options?.onPending?.();
        },
        onError: (result) => {
          console.error("Payment error:", result);
          toast.error("Payment failed. Please try again.");
          options?.onError?.("Payment failed");
        },
        onClose: () => {
          console.log("Payment popup closed");
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      console.error("Checkout error:", message);
      toast.error(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading };
}
