import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[VERIFY-PAYMENT] Request received");
    const { session_id } = await req.json();
    console.log("[VERIFY-PAYMENT] Session ID:", session_id);
    
    if (!session_id) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    console.log("[VERIFY-PAYMENT] Retrieving Stripe session");
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("[VERIFY-PAYMENT] Payment status:", session.payment_status);
    console.log("[VERIFY-PAYMENT] Metadata:", session.metadata);

    if (session.payment_status === "paid") {
      const orderId = session.metadata?.order_id;
      console.log("[VERIFY-PAYMENT] Order ID from metadata:", orderId);
      
      if (!orderId) {
        throw new Error("Order ID not found in session metadata");
      }

      // Update order status to paid
      console.log("[VERIFY-PAYMENT] Updating order status");
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("[VERIFY-PAYMENT] Database update error:", updateError);
        throw updateError;
      }

      console.log("[VERIFY-PAYMENT] Order updated successfully");
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "paid",
          order_id: orderId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[VERIFY-PAYMENT] Payment not completed");
    return new Response(
      JSON.stringify({ 
        success: false, 
        status: session.payment_status 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});