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

      const systemPrompt = `You are a purchase order parser. Extract structured data from the document.
Return ONLY a valid JSON object with this exact structure:
{
  "doc_no": "document number or null",
  "doc_date": "date in DD/MM/YYYY format or null",
  "location": "location/restaurant name or null",
  "items": [
    {
      "item_code": "item code",
      "item_name": "item name",
      "unit": "unit like BTL, PCS, KG",
      "quantity": number,
      "price_per_unit": number,
      "price_total": number
    }
  ]
}

Extract ALL items from the table. Each row with an item code, name, quantity, and price should be an item.
For the document number, look for patterns like "ML-XXXXX" or similar.
For the date, look for dates in the header area.`;

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

    // Text content parsing (for CSV/pasted content)
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing text content...');

    // Parse the Market List format
    const lines = content.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    
    let docNo: string | null = null;
    let docDate: string | null = null;
    let location: string | null = null;
    const items: ParsedItem[] = [];

    // Extract header info
    for (const line of lines) {
      if (line.includes('ML-') || line.match(/DocNo.*ML-/i)) {
        const match = line.match(/(ML-[A-Z0-9]+)/);
        if (match) docNo = match[1];
      }
      if (line.match(/\d{2}\/\d{2}\/\d{4}/) && !docDate) {
        const match = line.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (match) docDate = match[1];
      }
      if (line.toLowerCase().includes('restaurant') || line.toLowerCase().includes('attiko')) {
        location = line;
      }
    }

    // Parse table rows
    for (const line of lines) {
      if (line.includes('Item Code') || line.includes('---') || line.includes('| -')) continue;
      
      const tableParts = line.split('|').map((p: string) => p.trim()).filter((p: string) => p);
      
      if (tableParts.length >= 6) {
        const code = tableParts[0];
        const name = tableParts[1];
        const delivery = tableParts[2];
        const unit = tableParts[3] || tableParts[2];
        const qty = parseFloat(tableParts[tableParts.length - 3]) || parseFloat(tableParts[4]) || 0;
        const price = parseFloat(tableParts[tableParts.length - 2]) || parseFloat(tableParts[5]) || 0;
        const value = parseFloat(tableParts[tableParts.length - 1]) || parseFloat(tableParts[6]) || 0;

        if (code && /^[A-Z0-9]+$/i.test(code) && name && value > 0) {
          items.push({
            item_code: code,
            item_name: name,
            delivery_date: delivery.match(/\d{2}\/\d{2}\/\d{4}/) ? delivery : null,
            unit: unit,
            quantity: qty,
            price_per_unit: price,
            price_total: value
          });
        }
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.price_total, 0);

    const result: ParsedOrder = {
      doc_no: docNo,
      doc_date: docDate,
      location: location,
      items: items,
      total_amount: totalAmount
    };

    console.log(`Parsed ${items.length} items, total: ${totalAmount}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
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
