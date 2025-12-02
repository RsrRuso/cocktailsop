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
    const { storyId, mediaUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Analyze story content with AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert social media analyst. Analyze story content and provide insights.
Return a JSON object with:
- viralScore (0-100): likelihood of going viral
- mood: detected emotional tone
- style: visual style category
- quality: content quality rating (low/medium/high)
- estimatedViews: predicted view count
- estimatedReach: predicted reach percentage
- bestPostTime: optimal posting time
- suggestions: array of 3-4 actionable improvement tips`
          },
          {
            role: "user",
            content: `Analyze this story. Media URL: ${mediaUrl || "image/video content"}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_story",
              description: "Analyze story content and return insights",
              parameters: {
                type: "object",
                properties: {
                  viralScore: { type: "number" },
                  mood: { type: "string" },
                  style: { type: "string" },
                  quality: { type: "string" },
                  estimatedViews: { type: "string" },
                  estimatedReach: { type: "string" },
                  bestPostTime: { type: "string" },
                  suggestions: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["viralScore", "mood", "style", "quality", "estimatedViews", "estimatedReach", "bestPostTime", "suggestions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_story" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No analysis returned from AI");
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
