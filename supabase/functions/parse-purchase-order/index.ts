import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedItem {
  item_code: string;
  item_name: string;
  delivery_date: string | null;
  unit: string;
  quantity: number;
  price_per_unit: number;
  price_total: number;
}

interface ParsedOrder {
  doc_no: string | null;
  doc_date: string | null;
  location: string | null;
  items: ParsedItem[];
  total_amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, pdfBase64, imageBase64, imageMimeType } = await req.json();
    
    // If PDF or image base64 is provided, use AI to parse it
    if (pdfBase64 || imageBase64) {
      console.log(pdfBase64 ? 'Parsing PDF with AI...' : 'Parsing image with AI...');
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const systemPrompt = `You are an intelligent purchase order/invoice parser. Extract structured data from ANY document format - invoices, purchase orders, market lists, delivery notes, receipts, etc.

Return ONLY a valid JSON object with this exact structure:
{
  "doc_no": "document/invoice/PO number or null",
  "doc_date": "date in DD/MM/YYYY format or null",
  "location": "supplier/vendor/restaurant name or null",
  "items": [
    {
      "item_code": "item/product/SKU code (or empty string if not present)",
      "item_name": "item/product name or description",
      "unit": "unit of measure (BTL, PCS, KG, EA, CS, etc) or empty string",
      "quantity": number,
      "price_per_unit": number (0 if not shown),
      "price_total": number (calculate from qty * price if only one is shown)
    }
  ]
}

IMPORTANT RULES:
- Extract ALL line items from tables, lists, or itemized sections
- Handle ANY column order or naming (Qty, Quantity, Amount, Price, Rate, Value, Total, etc.)
- Item codes may be: SKU, product code, part number, article number, or similar
- If price_total is shown but not price_per_unit, calculate it (total / qty)
- If only unit price is shown, calculate total (qty * unit_price)
- Document numbers can be: PO#, Invoice#, Order#, Ref#, ML-XXXX, or any identifier
- Dates can be in any format - convert to DD/MM/YYYY
- Location can be: supplier name, vendor, ship-to address, or company name
- If a field isn't present in the document, use null or empty string as appropriate`;


      // Determine the data URL based on content type
      let dataUrl: string;
      if (pdfBase64) {
        dataUrl = `data:application/pdf;base64,${pdfBase64}`;
      } else {
        const mimeType = imageMimeType || 'image/png';
        dataUrl = `data:${mimeType};base64,${imageBase64}`;
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
            { 
              role: 'user', 
              content: [
                { type: 'text', text: 'Parse this purchase order/market list document and extract all items:' },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to parse document with AI' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await response.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '';
      
      console.log('AI response:', aiContent);
      
      // Extract JSON from the response
      let parsed: ParsedOrder;
      try {
        // Try to find JSON in the response
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const totalAmount = parsed.items?.reduce((sum, item) => sum + (item.price_total || 0), 0) || 0;
      parsed.total_amount = totalAmount;

      console.log(`AI parsed ${parsed.items?.length || 0} items, total: ${totalAmount}`);

      return new Response(
        JSON.stringify({ success: true, data: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Text content parsing (for CSV/pasted content/Excel) - use AI for flexibility
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing text content with AI...');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textSystemPrompt = `You are an intelligent purchase order/invoice parser. Extract structured data from ANY text format - CSV, tab-separated, pasted tables, etc.

Return ONLY a valid JSON object with this exact structure:
{
  "doc_no": "document/invoice/PO number or null",
  "doc_date": "date in DD/MM/YYYY format or null",
  "location": "supplier/vendor/restaurant name or null",
  "items": [
    {
      "item_code": "item/product/SKU code (or empty string if not present)",
      "item_name": "item/product name or description",
      "unit": "unit of measure (BTL, PCS, KG, EA, CS, etc) or empty string",
      "quantity": number,
      "price_per_unit": number (0 if not shown),
      "price_total": number (calculate from qty * price if only one is shown)
    }
  ]
}

IMPORTANT RULES:
- Extract ALL line items from the text
- Handle ANY column order or delimiter (comma, tab, pipe, etc.)
- Item codes may be: SKU, product code, part number, or similar
- If price_total is shown but not price_per_unit, calculate it
- If only unit price is shown, calculate total
- Document numbers can be any identifier in the header
- Dates can be in any format - convert to DD/MM/YYYY
- If a field isn't present, use null or empty string as appropriate`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: textSystemPrompt },
          { role: 'user', content: `Parse this purchase order/invoice text and extract all items:\n\n${content}` }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse content with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response for text:', aiContent);
    
    let parsed: ParsedOrder;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalAmount = parsed.items?.reduce((sum, item) => sum + (item.price_total || 0), 0) || 0;
    parsed.total_amount = totalAmount;

    console.log(`AI parsed ${parsed.items?.length || 0} items from text, total: ${totalAmount}`);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error parsing purchase order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
