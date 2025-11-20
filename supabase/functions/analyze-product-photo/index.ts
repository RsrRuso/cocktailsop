// @deno-types="npm:@types/node"

console.log("Analyze Product Photo function initialized")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageData } = await req.json()

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'AI key is not configured on the backend' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log('Received image for analysis, length:', imageData.length)

    // Use Lovable AI to analyze the product image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are helping with bar and restaurant inventory. Analyze this product photo and extract JSON with this exact shape: {"name": "product name", "brand": "brand name", "category": "category", "description": "brief description"}. Focus on food/beverage products, bottles, ingredients, or bar/restaurant inventory items. If unsure, make your best guess.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
      }),
    })

    const contentType = aiResponse.headers.get('content-type') || ''
    console.log('AI gateway status:', aiResponse.status, 'content-type:', contentType)

    const aiText = await aiResponse.text()

    if (!aiResponse.ok) {
      console.error('AI gateway error body:', aiText)
      const status = aiResponse.status === 429 || aiResponse.status === 402 ? aiResponse.status : 500
      const errorMessage =
        status === 429
          ? 'AI rate limit exceeded, please try again shortly.'
          : status === 402
            ? 'Workspace AI credits are exhausted, please top up in settings.'
            : 'AI analysis failed'

      return new Response(
        JSON.stringify({ error: errorMessage, details: aiText }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let content = ''
    try {
      const aiResult = JSON.parse(aiText)
      content = aiResult.choices?.[0]?.message?.content || ''
    } catch (e) {
      console.error('Failed to parse AI JSON, using raw text instead:', e)
      content = aiText
    }

    // Try to extract JSON from the response
    let productInfo
    try {
      // Look for JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        productInfo = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: parse the content as is
        productInfo = {
          name: 'Unknown Product',
          brand: '',
          category: '',
          description: content,
        }
      }
    } catch (e) {
      console.error('Error extracting product JSON, using fallback:', e)
      productInfo = {
        name: 'Unknown Product',
        brand: '',
        category: '',
        description: content,
      }
    }

    return new Response(
      JSON.stringify(productInfo),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error('Error in analyze-product-photo function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
