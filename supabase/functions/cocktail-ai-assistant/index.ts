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
    const requestBody = await req.json();
    
    // Validate request structure
    if (!requestBody.action || typeof requestBody.action !== 'string') {
      throw new Error('Invalid or missing action parameter');
    }
    
    if (!requestBody.data || typeof requestBody.data !== 'object') {
      throw new Error('Invalid or missing data parameter');
    }
    
    const validActions = [
      'suggest_ingredients',
      'analyze_taste',
      'recommend_technique',
      'calculate_nutrition',
      'suggest_garnish',
      'optimize_ratios'
    ];
    
    if (!validActions.includes(requestBody.action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }
    
    const { action, data } = requestBody;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'suggest_ingredients':
        systemPrompt = 'You are an expert mixologist. Suggest ingredients for cocktails based on the drink type, existing ingredients, and flavor profile. Return a JSON array of ingredient objects with name, amount (in ml), unit, and ABV percentage.';
        userPrompt = `Suggest ingredients for a ${data.drinkType || 'cocktail'} with these existing ingredients: ${JSON.stringify(data.existingIngredients || [])}. Desired flavor profile: ${data.flavorProfile || 'balanced'}.`;
        break;

      case 'analyze_taste':
        systemPrompt = 'You are an expert mixologist. Analyze the taste profile of a cocktail based on its ingredients and provide ratings for sweet, sour, salty, umami, and bitter on a scale of 0-10.';
        userPrompt = `Analyze the taste profile for a cocktail with these ingredients: ${JSON.stringify(data.ingredients)}. Return JSON with sweet, sour, salty, umami, bitter (each 0-10).`;
        break;

      case 'recommend_technique':
        systemPrompt = 'You are an expert mixologist. Recommend the best preparation technique based on the cocktail ingredients and desired outcome.';
        userPrompt = `Recommend the best technique for a cocktail with these ingredients: ${JSON.stringify(data.ingredients)}. Consider the ingredient types and desired serving style.`;
        break;

      case 'calculate_nutrition':
        systemPrompt = 'You are a nutritionist specializing in beverages. Calculate nutritional information (calories, sugar, carbs) for cocktails based on ingredients.';
        userPrompt = `Calculate nutrition for a cocktail with these ingredients: ${JSON.stringify(data.ingredients)}. Return JSON with calories, sugar_grams, carbs_grams, protein_grams.`;
        break;

      case 'suggest_garnish':
        systemPrompt = 'You are an expert mixologist. Suggest appropriate garnishes based on the cocktail type, ingredients, and presentation style.';
        userPrompt = `Suggest garnishes for a ${data.drinkName} with these ingredients: ${JSON.stringify(data.ingredients)}. Glass: ${data.glass}. Provide 3-5 creative options.`;
        break;

      case 'optimize_ratios':
        systemPrompt = 'You are an expert mixologist. Analyze ingredient ratios and suggest optimizations for balance and taste.';
        userPrompt = `Analyze and optimize these cocktail ratios: ${JSON.stringify(data.ingredients)}. Suggest improvements for better balance. Return optimized amounts in ml.`;
        break;

      default:
        throw new Error('Invalid action');
    }

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
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'provide_result',
            description: 'Provide the analysis result in JSON format',
            parameters: {
              type: 'object',
              properties: {
                result: {
                  type: 'object',
                  description: 'The analysis result'
                }
              },
              required: ['result']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'provide_result' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsedResult = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(parsedResult.result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to text response
    const content = result.choices?.[0]?.message?.content;
    return new Response(
      JSON.stringify({ result: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});