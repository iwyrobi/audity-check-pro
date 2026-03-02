import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  department_id: string | null;
  role: "super_admin" | "admin" | "department_head" | "user";
  organization_id: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify they're admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is super_admin
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "super_admin")
      .single();

    if (!roles) {
      throw new Error("Only super admins can create users");
    }

    // Parse request body
    const { email, password, full_name, department_id, role, organization_id }: CreateUserRequest = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name },
    });

    if (createError) {
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    // Update profile with department, organization, and name
    const profileUpdate: Record<string, unknown> = {};
    if (full_name) profileUpdate.full_name = full_name;
    if (department_id) profileUpdate.department_id = department_id;
    if (organization_id) profileUpdate.organization_id = organization_id;

    if (Object.keys(profileUpdate).length > 0) {
      await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", newUser.user.id);
    }

    // Add to organization_members if organization_id provided
    if (organization_id) {
      await adminClient
        .from("organization_members")
        .insert({
          organization_id,
          user_id: newUser.user.id,
          role: "member",
        });
    }

    // Update role (delete default 'user' role and insert new one if different)
    if (role && role !== "user") {
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", newUser.user.id);

      await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});