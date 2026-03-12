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

    // Authenticate user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { order_id } = await req.json();
    if (!order_id) {
      throw new Error("Missing order_id");
    }

    // Get user's organization
    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error("User has no organization");
    }

    // Verify the order belongs to the user's org by checking order_id prefix
    if (!order_id.startsWith(`opsecta-${profile.organization_id.slice(0, 8)}`)) {
      throw new Error("Order does not belong to your organization");
    }

    // Check Midtrans transaction status
    const authString = btoa(MIDTRANS_SERVER_KEY + ":");
    const midtransResponse = await fetch(
      `https://api.midtrans.com/v2/${order_id}/status`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authString}`,
        },
      }
    );

    const midtransData = await midtransResponse.json();
    console.log("Midtrans status check:", JSON.stringify(midtransData));

    if (!midtransResponse.ok) {
      return new Response(
        JSON.stringify({ status: "not_found", message: "Transaction not found in payment gateway" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      transaction_status,
      fraud_status,
      gross_amount,
      transaction_id,
      payment_type,
      transaction_time,
    } = midtransData;

    // Determine subscription status
    let subscriptionStatus: string;
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        subscriptionStatus = "active";
      } else {
        subscriptionStatus = "pending";
      }
    } else if (transaction_status === "pending") {
      subscriptionStatus = "pending";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      subscriptionStatus = "cancelled";
    } else if (transaction_status === "refund" || transaction_status === "partial_refund") {
      subscriptionStatus = "refunded";
    } else {
      subscriptionStatus = transaction_status;
    }

    // Extract plan_tier and billing_cycle from custom fields
    const plan_tier = midtransData.custom_field2 || "starter";
    const billing_cycle = midtransData.custom_field3 || "monthly";

    // Calculate subscription period
    const now = new Date();
    let subscriptionEnd: Date;
    if (billing_cycle === "yearly") {
      subscriptionEnd = new Date(now);
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    } else {
      subscriptionEnd = new Date(now);
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    }

    // Generate invoice number
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${order_id.split("-").pop()}`;

    // Upsert payment record
    const paymentData: Record<string, unknown> = {
      order_id,
      organization_id: profile.organization_id,
      plan_tier,
      billing_cycle,
      amount: Math.round(parseFloat(gross_amount || "0")),
      currency: "IDR",
      status: subscriptionStatus,
      payment_method: payment_type || null,
      transaction_id: transaction_id || null,
      invoice_number: invoiceNumber,
      updated_at: new Date().toISOString(),
    };

    if (subscriptionStatus === "active") {
      paymentData.paid_at = transaction_time || now.toISOString();
      paymentData.subscription_start = now.toISOString();
      paymentData.subscription_end = subscriptionEnd.toISOString();
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order_id)
      .maybeSingle();

    if (existingPayment) {
      await supabase.from("payments").update(paymentData).eq("order_id", order_id);
    } else {
      paymentData.created_at = now.toISOString();
      await supabase.from("payments").insert(paymentData);
    }

    // Update organization if payment is successful
    if (subscriptionStatus === "active") {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("tier", plan_tier)
        .eq("is_active", true)
        .single();

      const updateData: Record<string, unknown> = {
        stripe_subscription_status: subscriptionStatus,
        stripe_subscription_id: order_id,
        trial_ends_at: null,
        subscription_expires_at: subscriptionEnd.toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (plan) {
        updateData.subscription_plan_id = plan.id;
      }

      await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", profile.organization_id);
    }

    return new Response(
      JSON.stringify({
        status: subscriptionStatus,
        transaction_status,
        plan_tier,
        billing_cycle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Verify payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
