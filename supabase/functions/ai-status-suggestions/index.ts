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
    const { currentText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a creative social media status writer. Generate 4 short, engaging status updates for social media.

Rules:
- Each status should be 5-15 words max
- Include relevant emojis
- Be positive, creative, and engaging
- Make them feel personal and authentic
- Vary the tone: motivational, fun, thoughtful, celebratory

${currentText ? `The user is thinking about: "${currentText}". Use this as inspiration but create variations.` : 'Generate general mood/life status ideas.'}

Return ONLY a JSON array of 4 strings, no other text. Example:
["✨ Living my best life today", "🚀 Ready for new adventures", "☕ Coffee and good vibes only", "🌟 Making magic happen"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: currentText || 'Generate creative status ideas' }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
      // Fallback suggestions
      suggestions = [
        "✨ Living in the moment",
        "🚀 Ready for new adventures",
        "💫 Grateful for today",
        "🌟 Making magic happen",
      ];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in ai-status-suggestions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [
        "✨ Living in the moment",
        "🚀 Ready for new adventures",
        "💫 Grateful for today", 
        "🌟 Making magic happen",
      ]
    }), {
      status: 200, // Return 200 with fallback suggestions
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});