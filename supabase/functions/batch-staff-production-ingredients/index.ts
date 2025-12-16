import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const groupId = body?.groupId as string | undefined;
    const pin = body?.pin as string | undefined;
    const productionId = body?.productionId as string | undefined;

    if (!groupId || !uuidRegex.test(groupId)) {
      return new Response(JSON.stringify({ error: "Invalid groupId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "Invalid PIN" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!productionId || !uuidRegex.test(productionId)) {
      return new Response(JSON.stringify({ error: "Invalid productionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify PIN for this group
    const { data: member, error: memberErr } = await supabase
      .from("mixologist_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("pin_code", pin)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (memberErr) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!member) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure production belongs to this group
    const { data: prod, error: prodErr } = await supabase
      .from("batch_productions")
      .select("id, group_id")
      .eq("id", productionId)
      .maybeSingle();

    if (prodErr) {
      return new Response(JSON.stringify({ error: prodErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prod || prod.group_id !== groupId) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ingredients, error: ingErr } = await supabase
      .from("batch_production_ingredients")
      .select("*")
      .eq("production_id", productionId);

    if (ingErr) {
      return new Response(JSON.stringify({ error: ingErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ingredients: ingredients ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
