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
    const { action, message, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "suggest_replies":
        systemPrompt = "You are a helpful AI assistant that suggests 3 quick, contextual reply options. Keep them concise (max 10 words each), natural, and diverse in tone (casual, professional, friendly). Return ONLY a JSON array of strings.";
        userPrompt = `Generate 3 quick reply suggestions for this message:\n\n"${message}"\n\nContext: ${context || 'casual conversation'}`;
        break;
      
      case "improve_message":
        systemPrompt = "You are a helpful writing assistant. Improve the given message to be clearer, more professional, and grammatically correct while preserving the original intent. Return ONLY the improved message text, no explanations.";
        userPrompt = `Improve this message:\n\n"${message}"`;
        break;
      
      case "make_casual":
        systemPrompt = "Rewrite the message in a casual, friendly tone. Return ONLY the rewritten message.";
        userPrompt = message;
        break;
      
      case "make_professional":
        systemPrompt = "Rewrite the message in a professional, formal tone. Return ONLY the rewritten message.";
        userPrompt = message;
        break;
      
      case "make_concise":
        systemPrompt = "Make this message more concise while preserving key information. Return ONLY the shortened message.";
        userPrompt = message;
        break;
      
      case "analyze_tone":
        systemPrompt = "Analyze the tone of this message. Return a JSON object with: tone (string: positive/neutral/negative/urgent), emotion (string), and suggestions (array of strings for improvement).";
        userPrompt = message;
        break;
      
      case "translate":
        const targetLang = context || "Spanish";
        systemPrompt = `Translate the message to ${targetLang}. Return ONLY the translated text.`;
        userPrompt = message;
        break;
      
      case "summarize":
        systemPrompt = "Summarize this conversation in 2-3 sentences. Return ONLY the summary.";
        userPrompt = message;
        break;
      
      default:
        throw new Error("Unknown action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Neuron AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
