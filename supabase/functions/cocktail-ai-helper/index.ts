import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "method") {
      // Generate method based on ingredients and technique
      systemPrompt = "You are a professional bartender and cocktail expert. Generate clear, concise step-by-step preparation instructions for cocktails. Focus on technique, timing, and proper execution. Keep it under 200 words.";
      
      const { ingredients, technique, glass, ice, garnish } = data;
      userPrompt = `Generate a professional preparation method for a cocktail with these details:

Technique: ${technique}
Glass: ${glass}
Ice: ${ice}
Garnish: ${garnish}

Ingredients:
${ingredients.map((ing: any) => `- ${ing.amount}${ing.unit} ${ing.name} ${ing.type ? `(${ing.type})` : ''}`).join('\n')}

Write step-by-step instructions that include:
1. Glass preparation (if needed)
2. Building/mixing steps in correct order
3. Technique-specific details (stirring time, shaking duration, etc.)
4. Final presentation with garnish

Use professional but clear language.`;
    } else if (type === "allergen") {
      // Detect allergens from ingredients
      systemPrompt = "You are a food safety expert specializing in allergen identification. Analyze ingredients and identify common allergens. Be thorough and list all potential allergens.";
      
      const { ingredients } = data;
      userPrompt = `Analyze these cocktail ingredients and identify any allergens from the common allergen list (dairy, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame):

${ingredients.map((ing: any) => `- ${ing.name} (${ing.type})`).join('\n')}

List ONLY the allergens present, separated by commas. If no allergens, respond with "None". Be specific (e.g., "Soy (from syrup)", "Eggs (from foam)").`;
    }

    console.log("AI request type:", type);

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received:", type);

    return new Response(
      JSON.stringify({ result: content.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cocktail-ai-helper:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
