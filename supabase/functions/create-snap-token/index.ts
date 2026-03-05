import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIDTRANS_SANDBOX_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

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
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { plan_tier, billing_cycle } = await req.json();

    if (!plan_tier || !billing_cycle) {
      throw new Error("Missing plan_tier or billing_cycle");
    }

    // Get organization info
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error("User has no organization");
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, email")
      .eq("id", profile.organization_id)
      .single();

    // Get subscription plan
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("tier", plan_tier)
      .eq("is_active", true)
      .single();

    if (!plan) {
      throw new Error(`Plan not found for tier: ${plan_tier}`);
    }

    // Calculate amount in IDR (Midtrans uses IDR as base)
    const EXCHANGE_RATE = 16000;
    let amountIDR: number;
    if (billing_cycle === "yearly") {
      amountIDR = Math.round(plan.price_yearly_cents * EXCHANGE_RATE / 100);
    } else {
      amountIDR = Math.round(plan.price_monthly_cents * EXCHANGE_RATE / 100);
    }

    const orderId = `opsecta-${org!.id.slice(0, 8)}-${Date.now()}`;

    const transactionDetails = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amountIDR,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: profile.full_name || "Customer",
        email: user.email,
      },
      item_details: [
        {
          id: plan.id,
          price: amountIDR,
          quantity: 1,
          name: `${plan.name} Plan (${billing_cycle === "yearly" ? "Annual" : "Monthly"})`,
        },
      ],
      custom_field1: profile.organization_id,
      custom_field2: plan_tier,
      custom_field3: billing_cycle,
    };

    // Call Midtrans Snap API
    const authString = btoa(MIDTRANS_SERVER_KEY + ":");
    const midtransResponse = await fetch(MIDTRANS_SANDBOX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(transactionDetails),
    });

    const midtransData = await midtransResponse.json();

    if (!midtransResponse.ok) {
      console.error("Midtrans error:", midtransData);
      throw new Error(`Midtrans API error [${midtransResponse.status}]: ${JSON.stringify(midtransData)}`);
    }

    return new Response(
      JSON.stringify({
        token: midtransData.token,
        redirect_url: midtransData.redirect_url,
        order_id: orderId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating snap token:", error);
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
