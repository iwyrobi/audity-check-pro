import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, full_name, organization_name }: RegisterRequest =
      await req.json();

    // Validate inputs
    if (!email || !password || !full_name || !organization_name) {
      throw new Error("All fields are required");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    if (organization_name.trim().length < 2) {
      throw new Error("Organization name must be at least 2 characters");
    }

    // Create slug from org name
    const slug = organization_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const { data: existingOrg } = await adminClient
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    const finalSlug = existingOrg
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // 1. Create the user
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (createError) {
      throw new Error(createError.message);
    }
    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    const userId = newUser.user.id;

    // 2. Create the organization with starter plan
    const starterPlanId = "fc1c42ee-9485-41c1-aab7-ff4ad0de36bd";

    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: organization_name.trim(),
        slug: finalSlug,
        subscription_plan_id: starterPlanId,
      })
      .select("id")
      .single();

    if (orgError) {
      // Cleanup: delete user if org creation fails
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error("Failed to create organization: " + orgError.message);
    }

    // 3. Add user as org owner
    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      console.error("Failed to add org member:", memberError);
    }

    // 4. Update profile with organization_id
    await adminClient
      .from("profiles")
      .update({ organization_id: org.id, full_name })
      .eq("user_id", userId);

    // 5. Upgrade role from 'user' to 'super_admin'
    // Wait briefly to ensure the handle_new_user trigger has completed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin" });

    if (roleError) {
      console.error("Failed to set super_admin role:", roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        organization_id: org.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error registering organization:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
