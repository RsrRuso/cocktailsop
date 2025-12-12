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
    const { content } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing purchase order content...');

    // Parse the Market List format
    const lines = content.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    
    let docNo: string | null = null;
    let docDate: string | null = null;
    let location: string | null = null;
    const items: ParsedItem[] = [];

    // Extract header info - look for DocNo, DocDt, LocnCode
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

    // Parse table rows - look for item data patterns
    // Format: Item Code | Item Name | Delivery | Unit | Qty | Price | Value
    const itemPattern = /^([A-Z0-9]+)\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Z]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/i;
    
    // Also try parsing table format from markdown
    for (const line of lines) {
      // Skip header rows and separators
      if (line.includes('Item Code') || line.includes('---') || line.includes('| -')) continue;
      
      // Try to parse markdown table format: | code | name | date | unit | qty | price | value |
      const tableParts = line.split('|').map((p: string) => p.trim()).filter((p: string) => p);
      
      if (tableParts.length >= 6) {
        const code = tableParts[0];
        const name = tableParts[1];
        const delivery = tableParts[2];
        const unit = tableParts[3] || tableParts[2]; // Sometimes unit comes before delivery
        const qty = parseFloat(tableParts[tableParts.length - 3]) || parseFloat(tableParts[4]) || 0;
        const price = parseFloat(tableParts[tableParts.length - 2]) || parseFloat(tableParts[5]) || 0;
        const value = parseFloat(tableParts[tableParts.length - 1]) || parseFloat(tableParts[6]) || 0;

        // Validate this looks like an item row (code should be alphanumeric)
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
