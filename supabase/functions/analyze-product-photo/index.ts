// @deno-types="npm:@types/node"

console.log("Analyze Product Photo function initialized")

Deno.serve(async (req) => {
  try {
    const { imageData } = await req.json()
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Use Lovable AI to analyze the product image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this product image and extract the following information in JSON format: {"name": "product name", "brand": "brand name", "category": "category", "description": "brief description"}. Focus on identifying food/beverage products, bottles, ingredients, or bar/restaurant inventory items.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ]
      })
    })

    if (!aiResponse.ok) {
      throw new Error('AI analysis failed')
    }

    const aiResult = await aiResponse.json()
    const content = aiResult.choices?.[0]?.message?.content || ''
    
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
          description: content
        }
      }
    } catch (e) {
      productInfo = {
        name: 'Unknown Product',
        brand: '',
        category: '',
        description: content
      }
    }

    return new Response(
      JSON.stringify(productInfo),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
