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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Fetching industry news digest...");

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const systemPrompt = `You are a hospitality industry news curator. Create a daily digest of the most important news and trends in the hospitality industry.

Format your response as a JSON object with this structure:
{
  "headline": "Brief catchy headline summarizing today's top story",
  "summary": "A 2-3 sentence overview of today's key themes",
  "articles": [
    {
      "title": "Article title",
      "category": "Cocktails" | "Spirits" | "Wine" | "Restaurants" | "Hotels" | "Industry Trends" | "Awards" | "Openings",
      "summary": "2-3 sentence summary",
      "importance": "high" | "medium" | "low"
    }
  ],
  "trending_topics": ["topic1", "topic2", "topic3"],
  "drink_of_the_day": {
    "name": "Cocktail name",
    "description": "Brief description"
  },
  "industry_tip": "A useful tip for hospitality professionals"
}

Include 5-8 articles covering diverse topics: bar openings/closings, new spirit releases, cocktail trends, restaurant news, industry awards, sommelier/bartender achievements, and hospitality technology.`;

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
          { 
            role: "user", 
            content: `Generate today's hospitality industry news digest for ${today}. Include the latest trends, openings, spirit launches, bartender competitions, and industry news. Make it informative and engaging for hospitality professionals.` 
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log("Raw AI response:", content);

    // Parse the JSON from the response
    let digest;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      digest = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a fallback structure
      digest = {
        headline: "Today's Hospitality Industry Update",
        summary: "Stay updated with the latest news from the hospitality world.",
        articles: [],
        trending_topics: ["Cocktails", "Sustainability", "Technology"],
        drink_of_the_day: {
          name: "Classic Negroni",
          description: "A timeless Italian aperitivo"
        },
        industry_tip: "Focus on guest experience above all else."
      };
    }

    // Add metadata
    digest.date = today;
    digest.generated_at = new Date().toISOString();

    console.log("Successfully generated digest");

    return new Response(
      JSON.stringify({ success: true, digest }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching industry news:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});