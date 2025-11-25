import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch confirmed patterns
    const { data: patterns, error } = await supabaseClient
      .from('matrix_patterns')
      .select('*')
      .eq('status', 'confirmed')
      .order('priority', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!patterns || patterns.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No confirmed patterns for feature generation', features: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const patternsSummary = patterns.map(p => ({
      title: p.title,
      description: p.description,
      category: p.category,
      frequency: p.frequency,
      priority: p.priority,
      trend: p.trend
    }));

    // Call Lovable AI for feature generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [{
          role: 'system',
          content: `You are MATRIX AI feature architect. Generate actionable feature proposals from user patterns.

Return JSON array of features in this exact format:
[
  {
    "title": "Feature title (clear and concise)",
    "description": "Detailed description with user benefits",
    "category": "ui|performance|feature|integration|other",
    "priority_score": number (1-100),
    "effort_estimate": "low|medium|high",
    "impact_estimate": "low|medium|high",
    "user_value": "What value does this bring to users",
    "technical_approach": "Brief technical approach",
    "related_patterns": ["pattern title 1", "pattern title 2"]
  }
]

Generate 3-7 high-impact features. Be specific and actionable.`
        }, {
          role: 'user',
          content: `Generate feature proposals from these ${patterns.length} user patterns:\n\n${JSON.stringify(patternsSummary, null, 2)}`
        }],
        temperature: 0.6,
        max_tokens: 2500
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const featuresText = aiData.choices[0]?.message?.content || '[]';
    
    let features;
    try {
      features = JSON.parse(featuresText);
    } catch {
      features = [];
    }

    // Store generated features
    const featuresToInsert = features.map((f: any) => ({
      title: f.title,
      description: f.description,
      category: f.category,
      priority_score: f.priority_score || 50,
      effort_estimate: f.effort_estimate || 'medium',
      impact_estimate: f.impact_estimate || 'medium',
      user_value: f.user_value,
      technical_approach: f.technical_approach,
      related_patterns: f.related_patterns || [],
      status: 'proposed'
    }));

    if (featuresToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('matrix_roadmap_features')
        .insert(featuresToInsert);

      if (insertError) console.error('Feature insert error:', insertError);
    }

    return new Response(
      JSON.stringify({ features: featuresToInsert }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
