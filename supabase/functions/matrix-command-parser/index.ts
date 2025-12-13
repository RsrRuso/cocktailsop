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

    const { command } = await req.json();

    if (!command?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Command is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to parse the command
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
          content: `You are a command parser for a hospitality management app. Parse user voice commands into structured actions.

Available tools and actions:

SCHEDULING (tool: "scheduling"):
- add_staff: Add a new staff member. Params: name, role (Bartender/Senior Bartender/Head Bartender/Bar Back/Support), area (indoor/outdoor)
- assign_station: Assign staff to a station. Params: staffName, station (Station 1/Station 2/Station 3), day (Monday-Sunday)
- generate_schedule: Auto-generate schedule. Params: week (this week/next week)
- view_schedule: Open the schedule page

INVENTORY (tool: "inventory"):
- check_stock: Check stock levels. Params: itemName (optional, for specific item)
- log_receive: Log received inventory. Params: itemName, quantity, store (optional)
- transfer_item: Transfer between stores. Params: itemName, fromStore, toStore, quantity
- check_low_stock: View low stock items
- view_inventory: Open inventory manager

BATCH (tool: "batch"):
- create_batch: Create a batch production. Params: recipeName, servings, liters
- scale_recipe: Scale a recipe. Params: recipeName, servings
- view_batches: View recent batch productions
- view_recipes: Open batch calculator

Return JSON only:
{
  "intent": "brief description of what user wants",
  "tool": "scheduling" | "inventory" | "batch" | "general",
  "action": "action_name",
  "parameters": { ... },
  "confidence": 0.0-1.0
}

Examples:
"Add John as a bartender for indoor" → {"intent":"add staff member","tool":"scheduling","action":"add_staff","parameters":{"name":"John","role":"Bartender","area":"indoor"},"confidence":0.95}
"Check vodka stock" → {"intent":"check stock levels","tool":"inventory","action":"check_stock","parameters":{"itemName":"vodka"},"confidence":0.9}
"Make 20 servings of negroni" → {"intent":"create batch","tool":"batch","action":"create_batch","parameters":{"recipeName":"negroni","servings":20},"confidence":0.9}
"Show me the schedule" → {"intent":"view schedule","tool":"scheduling","action":"view_schedule","parameters":{},"confidence":0.95}`
        }, {
          role: 'user',
          content: command
        }],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to parse command');
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0]?.message?.content || '';
    
    // Extract JSON from response
    let parsedCommand;
    try {
      // Try to parse directly
      parsedCommand = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedCommand = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    console.log('Parsed command:', parsedCommand);

    return new Response(
      JSON.stringify({ parsedCommand }),
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
