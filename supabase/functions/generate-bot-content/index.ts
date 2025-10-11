import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { botId, contentType } = await req.json();

    console.log(`Generating ${contentType} for bot ${botId}`);

    // Generate content using AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a ${contentType === 'post' ? 'social media content creator' : 'short video creator'} in the hospitality industry. Generate engaging, authentic content about bartending, mixology, cocktails, restaurant management, or culinary arts. Keep it professional but friendly.`
          },
          {
            role: 'user',
            content: contentType === 'post' 
              ? 'Create a short social media post (2-3 sentences) about bartending, cocktails, or hospitality. Make it interesting and authentic.'
              : 'Create a short caption (1 sentence) for a reel about bartending or mixology.'
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    console.log('Generated content:', generatedContent);

    if (contentType === 'post') {
      // Create post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: botId,
          content: generatedContent,
          media_urls: []
        });

      if (error) throw error;

      await supabase
        .from('bot_activity_log')
        .insert({
          bot_id: botId,
          activity_type: 'create_post'
        });

      return new Response(JSON.stringify({ success: true, content: generatedContent, type: 'post' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, content: generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
