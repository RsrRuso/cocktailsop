import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "suggest_ingredients") {
      systemPrompt = "You are a professional mixologist and beverage expert. Provide ingredient suggestions for cocktail batching.";
      userPrompt = `Suggest 5-7 ingredients for a ${data.recipeName || 'cocktail'} recipe. Return as JSON array with: name, amount, unit (ml/oz/cl/dash/barspoon).`;
    } else if (action === "optimize_recipe") {
      systemPrompt = "You are an expert in beverage cost optimization and recipe efficiency.";
      userPrompt = `Optimize this recipe for batch production: ${JSON.stringify(data.ingredients)}. Suggest improvements for scaling and efficiency.`;
    } else if (action === "forecast_par") {
      systemPrompt = "You are a data analyst specializing in inventory forecasting and par level calculations for beverage operations.";
      userPrompt = `Based on this production history: ${JSON.stringify(data.history)}.
      
Analyze the data and provide comprehensive par level suggestions with:

**WEEKLY ANALYSIS:**
- Average weekly production volume
- Recommended weekly par levels for each recipe
- Peak production days identified

**MONTHLY ANALYSIS:**
- Monthly consumption trends
- Seasonal patterns observed
- Recommended monthly stock levels

**QUARTERLY ANALYSIS:**
- Quarter-over-quarter growth trends
- Long-term inventory planning recommendations
- Predicted demand for next quarter

Format the response clearly with these three sections. Be specific with numbers and actionable recommendations.`;
    } else if (action === "analyze_trends") {
      systemPrompt = "You are a business intelligence analyst for beverage operations.";
      userPrompt = `Analyze these batch production trends: ${JSON.stringify(data.productions)}. Provide insights on popular recipes, seasonal patterns, and optimization opportunities.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Batch AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});