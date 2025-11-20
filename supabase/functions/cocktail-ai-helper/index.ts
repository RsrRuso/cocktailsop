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
      // Detect allergens from ingredients with heightened sensitivity
      systemPrompt = `You are a highly trained food safety expert specializing in allergen identification for cocktails and spirits. 

CRITICAL ALLERGEN KNOWLEDGE:
- Many spirits and liqueurs contain WHEAT (vodka, gin, whisky, some neutral spirits)
- Cream liqueurs contain DAIRY and may contain EGGS
- Amaretto and orgeat often contain TREE NUTS (almond)
- Some bitters contain TREE NUTS
- Egg whites are a common allergen in cocktails
- Any "cream of" liqueur likely contains DAIRY
- Vermouth and fortified wines may contain sulfites
- Syrups may contain SOY (lecithin as emulsifier)

Be EXTREMELY thorough and cautious. When in doubt about an ingredient containing wheat (spirits/liqueurs) or other allergens, FLAG IT.`;
      
      const { ingredients } = data;
      userPrompt = `Carefully analyze these cocktail ingredients and identify ALL potential allergens. Pay special attention to spirits and liqueurs that may contain wheat:

${ingredients.map((ing: any) => `- ${ing.name} (${ing.type})`).join('\n')}

Common allergen categories to check:
1. WHEAT - Check ALL spirits (vodka, gin, whisky, bourbon, etc.) and grain-based liqueurs
2. DAIRY - Cream liqueurs, milk, cream, butter
3. EGGS - Egg whites, egg-based liqueurs, some foams
4. TREE NUTS - Amaretto, orgeat, nut liqueurs, some bitters
5. SOY - Syrups with lecithin
6. GLUTEN - Overlaps with wheat in spirits
7. SULFITES - Wine, vermouth

List ALL identified allergens separated by commas with source in parentheses.
Example: "Wheat (vodka, gin), Dairy (cream), Eggs (egg white), Tree Nuts (amaretto)"

If no allergens detected, respond "None detected".
Be SPECIFIC and CAUTIOUS - err on the side of flagging potential allergens.`;
    } else if (type === "history") {
      // Generate cocktail history for classic cocktails
      systemPrompt = `You are a cocktail historian specializing in classic and iconic cocktails. Your knowledge includes the origins, creators, historical context, and cultural significance of famous cocktails.

When provided with a cocktail name:
- If it's a classic or well-known cocktail, provide a brief but engaging history (150-200 words)
- Focus on origin story, creator (if known), historical period, and cultural significance
- Write in an elegant, storytelling style suitable for a premium cocktail menu
- If it's NOT a classic or recognized cocktail, respond ONLY with "Not a classic cocktail"

RECOGNIZED CLASSIC COCKTAILS include but are not limited to:
Old Fashioned, Manhattan, Martini, Negroni, Margarita, Daiquiri, Mojito, Whiskey Sour, Mai Tai, Sazerac, Mint Julep, Moscow Mule, Boulevardier, Aviation, Last Word, Corpse Reviver, Vieux Carré, Blood and Sand, Sidecar, French 75, Clover Club, Bee's Knees, Gimlet, Tom Collins, Pisco Sour, Aperol Spritz, Americano, Caipirinha, Dark 'n' Stormy, Espresso Martini, Cosmopolitan, and other historically documented cocktails.`;
      
      const { drinkName } = data;
      userPrompt = `Generate a historical narrative for the cocktail: "${drinkName}"

If this is a classic, recognized cocktail, provide its history.
If this is NOT a classic cocktail or you're unsure, respond ONLY with "Not a classic cocktail"`;
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
        temperature: 0.3,
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
