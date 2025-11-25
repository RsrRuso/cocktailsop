import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI for insight analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: `You are MATRIX AI insight analyzer. Analyze user feedback, ideas, and bug reports to extract structured insights.

Your task: Extract key information and classify the insight.

Return JSON ONLY in this exact format:
{
  "type": "feature|bug|improvement|feedback",
  "category": "ui|performance|feature|integration|other",
  "priority": "low|medium|high|critical",
  "sentiment": "positive|neutral|negative",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "summary": "Brief 1-2 sentence summary of the insight",
  "actionable": true/false
}

Be concise and accurate.`
        }, {
          role: 'user',
          content: `Analyze this user insight:\n\n${content}`
        }],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0]?.message?.content || '{}';
    
    // Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // Fallback if AI doesn't return valid JSON
      analysis = {
        type: 'feedback',
        category: 'other',
        priority: 'medium',
        sentiment: 'neutral',
        keywords: [],
        summary: content.substring(0, 100),
        actionable: true
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
