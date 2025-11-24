import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('AI Comment Rewrite function called');

  try {
    const { text, context } = await req.json();
    
    console.log('Request body:', { text, context });
    
    if (!text || text.trim().length < 3) {
      console.log('Text too short, returning empty suggestions');
      return new Response(
        JSON.stringify({ suggestions: [] }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Calling AI gateway...');

    // Add randomness to ensure fresh suggestions each time
    const randomSeed = Math.random();
    const styleVariations = [
      "professional and polished",
      "concise and clear",
      "friendly and engaging",
      "enthusiastic and energetic",
      "thoughtful and insightful",
      "casual and relatable"
    ];

    // Pick 3 random styles
    const shuffled = styleVariations.sort(() => 0.5 - Math.random());
    const selectedStyles = shuffled.slice(0, 3);

    const systemPrompt = `You are an AI writing assistant that helps improve comment text. Generate 3 COMPLETELY DIFFERENT variations of the user's comment with these styles:
1. ${selectedStyles[0]}
2. ${selectedStyles[1]}
3. ${selectedStyles[2]}

Each variation MUST be unique and creative. Never repeat previous suggestions. Use different words, sentence structures, and expressions while maintaining the core meaning.

CRITICAL: Return ONLY a valid JSON array of exactly 3 strings, nothing else. No markdown, no explanation, just the array.

Example format: ["First suggestion here", "Second suggestion here", "Third suggestion here"]`;

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
          { role: "user", content: `Original comment: "${text}"\n\nContext: ${context || "General comment"}\n\nRandom seed: ${randomSeed}\n\nProvide 3 completely unique and creative variations as a JSON array.` }
        ],
        temperature: 0.95,
      }),
    });

    console.log('AI gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
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

    console.log('AI response content:', content);

    if (!content) {
      console.log('No content in AI response');
      return new Response(
        JSON.stringify({ suggestions: [] }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let suggestions: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
      } else {
        throw new Error("No JSON array found");
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // If parsing fails, try to extract suggestions from text
      const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
      suggestions = lines.slice(0, 3).map((line: string) => 
        line.replace(/^["'\-\d\.\)\s]+/, '').replace(/["']$/, '').trim()
      ).filter((s: string) => s.length > 0);
    }

    console.log('Final suggestions:', suggestions);

    return new Response(
      JSON.stringify({ suggestions: suggestions.filter(s => s.length > 0) }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-comment-rewrite:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: []
      }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
