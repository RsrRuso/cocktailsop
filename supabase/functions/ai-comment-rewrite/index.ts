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
    const { text, context } = await req.json();
    
    if (!text || text.trim().length < 3) {
      return new Response(
        JSON.stringify({ suggestions: [] }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an AI writing assistant that helps improve comment text. Generate 3 different variations of the user's comment that are:
1. More professional and polished
2. More concise and clear  
3. More friendly and engaging

Each variation should maintain the core meaning but improve the expression. Return ONLY a JSON array of 3 strings, nothing else.`;

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
          { role: "user", content: `Original comment: "${text}"\n\nContext: ${context || "General comment"}\n\nProvide 3 improved variations as a JSON array of strings.` }
        ],
        temperature: 0.8,
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
          JSON.stringify({ error: "Credits required. Please add credits to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ suggestions: [] }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(content);
      suggestions = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      // If parsing fails, try to extract suggestions from text
      const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
      suggestions = lines.slice(0, 3).map((line: string) => 
        line.replace(/^["'\-\d\.\)\s]+/, '').replace(/["']$/, '').trim()
      );
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.filter(s => s.length > 0) }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-comment-rewrite:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
