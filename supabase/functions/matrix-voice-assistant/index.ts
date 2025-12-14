import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent types for voice commands
type Intent = 
  | 'check_stock'
  | 'list_low_stock' 
  | 'compare_stores'
  | 'search_document'
  | 'find_location'
  | 'inventory_summary'
  | 'greeting'
  | 'general';

interface ParsedIntent {
  intent: Intent;
  entities: {
    itemName?: string;
    storeName?: string;
    documentType?: string;
    keywords?: string[];
  };
  confidence: number;
}

// Parse intent from command using AI
async function parseIntent(command: string): Promise<ParsedIntent> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: `You are a voice command parser for a hospitality inventory system. Parse commands into structured intents.

INTENTS:
- check_stock: User wants to know quantity of specific item. Extract itemName.
- list_low_stock: User wants to see items running low
- compare_stores: User wants to compare inventory between stores
- search_document: User wants to find info in uploaded PDFs/documents. Extract keywords.
- find_location: User wants to know where an item is stored. Extract itemName.
- inventory_summary: User wants overview of all inventory
- greeting: Just a greeting or wake acknowledgment
- general: Other questions not fitting above

EXAMPLES:
"Check Nick and Nora glass stock" → {"intent":"check_stock","entities":{"itemName":"Nick and Nora"},"confidence":0.95}
"How many coupe glasses do we have" → {"intent":"check_stock","entities":{"itemName":"Coupe"},"confidence":0.9}
"What's running low" → {"intent":"list_low_stock","entities":{},"confidence":0.95}
"Where are the martini glasses" → {"intent":"find_location","entities":{"itemName":"Martini"},"confidence":0.9}
"Compare Jerry and Attiko stores" → {"intent":"compare_stores","entities":{},"confidence":0.85}
"Search the SOP for garnish prep" → {"intent":"search_document","entities":{"keywords":["garnish","prep"]},"confidence":0.85}
"Give me an inventory overview" → {"intent":"inventory_summary","entities":{},"confidence":0.9}
"Hello" → {"intent":"greeting","entities":{},"confidence":0.95}

Return JSON only, no markdown.`
      }, {
        role: 'user',
        content: command
      }],
      temperature: 0.2,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    console.error('AI parse error:', await response.text());
    return { intent: 'general', entities: {}, confidence: 0.5 };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
    return parsed;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return { intent: 'general', entities: {}, confidence: 0.5 };
  }
}

// Query inventory from database
async function queryInventory(
  supabaseClient: any, 
  userId: string, 
  itemName?: string
): Promise<any> {
  // Get aliases for matching
  const { data: aliases } = await supabaseClient
    .from('item_aliases')
    .select('item_name, alias')
    .or(`is_global.eq.true,user_id.eq.${userId}`);
  
  // Normalize item name
  let searchName = itemName || '';
  if (aliases && itemName) {
    for (const alias of aliases) {
      if (alias.alias.toLowerCase() === itemName.toLowerCase() ||
          itemName.toLowerCase().includes(alias.alias.toLowerCase())) {
        searchName = alias.item_name;
        break;
      }
    }
  }
  
  // Query FIFO inventory
  let query = supabaseClient
    .from('fifo_inventory')
    .select(`
      quantity,
      updated_at,
      fifo_items!inner (name),
      fifo_stores!inner (name, id)
    `)
    .eq('user_id', userId);
  
  if (searchName) {
    query = query.ilike('fifo_items.name', `%${searchName}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Inventory query error:', error);
    return null;
  }
  
  return data;
}

// Format inventory response
function formatInventoryResponse(data: any[], itemName?: string): { text: string; data: any } {
  if (!data || data.length === 0) {
    return {
      text: itemName 
        ? `I couldn't find any ${itemName} in your inventory.`
        : `Your inventory appears to be empty.`,
      data: null
    };
  }
  
  // Aggregate by item and store
  const storeMap = new Map<string, number>();
  let total = 0;
  let actualItemName = itemName;
  
  for (const item of data) {
    const storeName = item.fifo_stores?.name || 'Unknown';
    const qty = item.quantity || 0;
    
    storeMap.set(storeName, (storeMap.get(storeName) || 0) + qty);
    total += qty;
    
    if (!actualItemName) {
      actualItemName = item.fifo_items?.name;
    }
  }
  
  const stores = Array.from(storeMap.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const highestStore = stores[0];
  
  // Build voice response
  let text = `You have ${total} ${actualItemName || 'items'} in total.`;
  
  if (stores.length > 1) {
    text += ` ${highestStore[0]} has the highest stock with ${highestStore[1]}.`;
  } else if (stores.length === 1) {
    text += ` All located at ${highestStore[0]}.`;
  }
  
  return {
    text,
    data: {
      itemName: actualItemName,
      total,
      locations: stores.map(([name, qty]) => ({ storeName: name, quantity: qty })),
      highestStock: highestStore ? { store: highestStore[0], quantity: highestStore[1] } : null
    }
  };
}

// Get low stock items
async function getLowStock(supabaseClient: any, userId: string, threshold = 10): Promise<any[]> {
  const { data, error } = await supabaseClient
    .from('fifo_inventory')
    .select(`
      quantity,
      fifo_items!inner (name),
      fifo_stores!inner (name)
    `)
    .eq('user_id', userId)
    .lt('quantity', threshold)
    .gt('quantity', 0);
  
  if (error) {
    console.error('Low stock query error:', error);
    return [];
  }
  
  return data || [];
}

// Search documents
async function searchDocuments(
  supabaseClient: any, 
  userId: string, 
  keywords: string[]
): Promise<any[]> {
  const { data, error } = await supabaseClient.rpc('search_matrix_documents', {
    p_user_id: userId,
    p_keywords: keywords
  });
  
  if (error) {
    console.error('Document search error:', error);
    return [];
  }
  
  return data || [];
}

// Generate response for general queries
async function generateGeneralResponse(
  command: string, 
  context: string,
  toneMode: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const toneInstructions = {
    professional: 'Keep responses brief, professional, and focused on business operations.',
    warm: 'Be friendly and helpful while staying efficient.',
    flirty: 'Be charming and personable while remaining professional about business matters.'
  };
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: `You are Matrix, an AI voice assistant for hospitality operations. ${toneInstructions[toneMode as keyof typeof toneInstructions] || toneInstructions.professional}

Context about current data:
${context}

Keep responses SHORT and suitable for voice - max 2-3 sentences. Be direct and helpful.`
      }, {
        role: 'user',
        content: command
      }],
      temperature: 0.5,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    return "I had trouble processing that. Please try again.";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "I'm not sure how to help with that.";
}

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

    const { command, userId, toneMode = 'professional' } = await req.json();

    if (!command?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Command is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing voice command:', command);

    // Parse the intent
    const parsed = await parseIntent(command);
    console.log('Parsed intent:', parsed);

    let response: string = '';
    let data: any = null;
    let cardType: string = 'text';

    switch (parsed.intent) {
      case 'check_stock':
      case 'find_location': {
        const inventoryData = await queryInventory(
          supabaseClient, 
          user.id, 
          parsed.entities.itemName
        );
        const result = formatInventoryResponse(inventoryData, parsed.entities.itemName);
        response = result.text;
        data = result.data;
        cardType = 'inventory';
        break;
      }
      
      case 'list_low_stock': {
        const lowStock = await getLowStock(supabaseClient, user.id);
        if (lowStock.length === 0) {
          response = "Good news! All items are above the low stock threshold.";
        } else {
          const items = lowStock.slice(0, 5).map(i => 
            `${i.fifo_items?.name}: ${i.quantity}`
          ).join(', ');
          response = `You have ${lowStock.length} items running low. Top items: ${items}.`;
          data = lowStock;
        }
        cardType = 'inventory';
        break;
      }
      
      case 'compare_stores': {
        const inventory = await queryInventory(supabaseClient, user.id);
        const storeMap = new Map<string, number>();
        
        for (const item of inventory || []) {
          const store = item.fifo_stores?.name || 'Unknown';
          storeMap.set(store, (storeMap.get(store) || 0) + (item.quantity || 0));
        }
        
        const stores = Array.from(storeMap.entries());
        if (stores.length === 0) {
          response = "No stores found with inventory data.";
        } else {
          const comparison = stores.map(([name, qty]) => `${name}: ${qty}`).join(', ');
          response = `Store comparison: ${comparison}.`;
          data = stores.map(([name, qty]) => ({ storeName: name, totalQuantity: qty }));
        }
        cardType = 'inventory';
        break;
      }
      
      case 'inventory_summary': {
        const inventory = await queryInventory(supabaseClient, user.id);
        const total = (inventory || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
        const stores = new Set((inventory || []).map((i: any) => i.fifo_stores?.name)).size;
        const items = new Set((inventory || []).map((i: any) => i.fifo_items?.name)).size;
        
        response = `You have ${total} units across ${items} different items in ${stores} stores.`;
        data = { totalUnits: total, uniqueItems: items, storeCount: stores };
        cardType = 'inventory';
        break;
      }
      
      case 'search_document': {
        const keywords = parsed.entities.keywords || command.split(' ').filter((w: string) => w.length > 3);
        const docs = await searchDocuments(supabaseClient, user.id, keywords);
        
        if (docs.length === 0) {
          response = "I couldn't find any documents matching that query.";
        } else {
          response = `Found ${docs.length} relevant sections. The most relevant is from ${docs[0].filename}.`;
          data = docs;
        }
        cardType = 'document';
        break;
      }
      
      case 'greeting': {
        const greetings = {
          professional: "Ready to assist. What do you need?",
          warm: "Hi there! How can I help you today?",
          flirty: "Hey you! What can I do for you?"
        };
        response = greetings[toneMode as keyof typeof greetings] || greetings.professional;
        break;
      }
      
      default: {
        // Get some context for general response
        const inventory = await queryInventory(supabaseClient, user.id);
        const total = (inventory || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
        const context = `User has ${total} total inventory items across their stores.`;
        
        response = await generateGeneralResponse(command, context, toneMode);
      }
    }

    console.log('Response:', response);

    return new Response(
      JSON.stringify({ 
        response, 
        intent: parsed.intent,
        entities: parsed.entities,
        data,
        cardType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "Sorry, I had trouble processing that request."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});