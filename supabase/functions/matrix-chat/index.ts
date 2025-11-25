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
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { message } = await req.json();

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant context from memory
    const { data: memories } = await supabaseClient
      .from('matrix_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent patterns and features
    const { data: patterns } = await supabaseClient
      .from('matrix_patterns')
      .select('title, description, category')
      .eq('status', 'confirmed')
      .limit(5);

    const { data: features } = await supabaseClient
      .from('matrix_roadmap_features')
      .select('title, description, status')
      .in('status', ['proposed', 'in_progress'])
      .limit(5);

    // Fetch platform members for source verification
    const { data: members } = await supabaseClient
      .from('profiles')
      .select('id, username, full_name, user_type, professional_title, badge_level')
      .limit(100);

    const context = {
      memories: memories?.map(m => m.content) || [],
      patterns: patterns || [],
      features: features || [],
      platformMembers: members || []
    };

    // Call Lovable AI for chat response
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
          content: `You are MATRIX AI, the collective intelligence advisor for SpecVerse. You help users understand platform insights, roadmap features, and provide guidance. You have access to platform members and can verify the source of information.

Context:
- Recent Patterns: ${JSON.stringify(context.patterns)}
- Upcoming Features: ${JSON.stringify(context.features)}
- Memory: ${JSON.stringify(context.memories.slice(0, 3))}
- Platform Members: ${JSON.stringify(context.platformMembers.slice(0, 20))}

Source Verification Capabilities:
- When users ask about information sources, cross-reference with platform member data
- Verify claims by checking member roles, badge levels, and professional titles
- Identify if information comes from verified experts (professional_title, badge_level)
- Flag unverified or suspicious information
- Provide member context when relevant (e.g., "This suggestion comes from a Gold Badge bartender")

Be helpful, concise, reference specific insights and verified sources when relevant. Guide users to submit feedback through proper channels. Always verify sources when information accuracy is questioned.`
        }, {
          role: 'user',
          content: message
        }],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices[0]?.message?.content || 'I apologize, but I could not process your request.';

    // Store chat message
    await supabaseClient.from('matrix_chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: response }
    ]);

    return new Response(
      JSON.stringify({ response }),
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
