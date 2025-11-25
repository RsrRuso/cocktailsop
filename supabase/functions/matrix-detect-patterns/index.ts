import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch recent insights for pattern detection
    const { data: insights, error } = await supabaseClient
      .from('matrix_insights')
      .select('*')
      .eq('status', 'processed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!insights || insights.length < 5) {
      return new Response(
        JSON.stringify({ message: 'Not enough insights for pattern detection', patterns: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group insights by category and keywords
    const insightsSummary = insights.map(i => ({
      type: i.type,
      category: i.category,
      keywords: i.keywords,
      summary: i.summary,
      priority: i.priority
    }));

    // Call Lovable AI for pattern detection
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
          content: `You are MATRIX AI pattern detector. Analyze user insights to identify common themes, recurring requests, and trends.

Return JSON array of patterns in this exact format:
[
  {
    "title": "Clear pattern title",
    "description": "Detailed description of the pattern",
    "category": "ui|performance|feature|integration|other",
    "frequency": number (how many insights relate to this),
    "priority": "low|medium|high|critical",
    "related_keywords": ["keyword1", "keyword2"],
    "trend": "growing|stable|declining"
  }
]

Identify 3-5 most significant patterns. Be concise and actionable.`
        }, {
          role: 'user',
          content: `Analyze these ${insights.length} user insights for patterns:\n\n${JSON.stringify(insightsSummary, null, 2)}`
        }],
        temperature: 0.4,
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const patternsText = aiData.choices[0]?.message?.content || '[]';
    
    let patterns;
    try {
      patterns = JSON.parse(patternsText);
    } catch {
      patterns = [];
    }

    // Store detected patterns
    const patternsToInsert = patterns.map((p: any) => ({
      title: p.title,
      description: p.description,
      category: p.category,
      frequency: p.frequency || 1,
      priority: p.priority,
      related_keywords: p.related_keywords || [],
      trend: p.trend || 'stable',
      status: 'detected'
    }));

    if (patternsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('matrix_patterns')
        .insert(patternsToInsert);

      if (insertError) console.error('Pattern insert error:', insertError);
    }

    return new Response(
      JSON.stringify({ patterns: patternsToInsert }),
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
