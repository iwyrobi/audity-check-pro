import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!MIDTRANS_SERVER_KEY) {
      throw new Error("MIDTRANS_SERVER_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Midtrans webhook received:", JSON.stringify(body));

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      custom_field1: organization_id,
      custom_field2: plan_tier,
      custom_field3: billing_cycle,
    } = body;

    // Verify signature
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const data = encoder.encode(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (expectedSignature !== signature_key) {
      console.error("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Midtrans status to our subscription status
    let subscriptionStatus: string;
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        subscriptionStatus = "active";
      } else {
        subscriptionStatus = "pending";
      }
    } else if (transaction_status === "pending") {
      subscriptionStatus = "pending";
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      subscriptionStatus = "cancelled";
    } else if (transaction_status === "refund" || transaction_status === "partial_refund") {
      subscriptionStatus = "refunded";
    } else {
      subscriptionStatus = transaction_status;
    }

    console.log(`Updating org ${organization_id}: status=${subscriptionStatus}, tier=${plan_tier}`);

    // Update organization subscription
    if (organization_id) {
      const updateData: Record<string, unknown> = {
        stripe_subscription_status: subscriptionStatus,
        stripe_subscription_id: order_id,
        updated_at: new Date().toISOString(),
      };

      // If payment is successful, update plan
      if (subscriptionStatus === "active" && plan_tier) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("tier", plan_tier)
          .eq("is_active", true)
          .single();

        if (plan) {
          updateData.subscription_plan_id = plan.id;
          updateData.trial_ends_at = null; // Clear trial on successful payment
        }
      }

      const { error: updateError } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", organization_id);

      if (updateError) {
        console.error("Error updating organization:", updateError);
        throw updateError;
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
