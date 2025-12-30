import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, BarChart3, TrendingUp, DollarSign, Package, Percent, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";

interface AIAnalyticsInquiryProps {
  outletId: string;
}

interface AnalyticsResult {
  type: 'text' | 'metric' | 'table' | 'comparison';
  title?: string;
  content?: string;
  value?: number;
  change?: number;
  unit?: string;
  data?: Array<Record<string, any>>;
  columns?: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  results?: AnalyticsResult[];
  loading?: boolean;
}

const QUICK_PROMPTS = [
  { label: "Average profit per item", prompt: "What is the average profit per menu item?" },
  { label: "Top selling items", prompt: "Show me the top 5 selling items this week" },
  { label: "Average order value", prompt: "What is the average order value?" },
  { label: "Cost analysis", prompt: "Analyze my food and beverage costs" },
  { label: "Best margin items", prompt: "Which items have the best profit margin?" },
  { label: "Worst performers", prompt: "Which items are underperforming?" },
];

export default function AIAnalyticsInquiry({ outletId }: AIAnalyticsInquiryProps) {
  const { formatPrice } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAnalyticsData = async () => {
    // Fetch all relevant data for AI analysis
    const ordersRes = await supabase
      .from("lab_ops_orders")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(500);
    
    const itemsRes = await supabase
      .from("lab_ops_order_items")
      .select("*, lab_ops_menu_items(name, base_price)")
      .limit(1000);
    
    const menuRes = await supabase
      .from("lab_ops_menu_items")
      .select("id, name, base_price, category_id")
      .eq("outlet_id", outletId);
    
    const recipesRes = await (supabase
      .from("lab_ops_recipes" as any)
      .select("id, version_number, yield_qty, menu_item_id")
      .eq("outlet_id", outletId)) as any;
    
    const inventoryRes = await supabase
      .from("lab_ops_inventory_items")
      .select("id, name, unit_cost, bottle_size_ml, base_unit")
      .eq("outlet_id", outletId);

    return {
      orders: ordersRes.data || [],
      orderItems: itemsRes.data || [],
      menuItems: menuRes.data || [],
      recipes: recipesRes.data || [],
      inventory: inventoryRes.data || []
    };
  };

  const buildAnalyticsContext = (data: any) => {
    const { orders, orderItems, menuItems, recipes, inventory } = data;
    
    // Calculate key metrics
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalCovers = orders.reduce((sum: number, o: any) => sum + (o.covers || 1), 0);
    const avgPerCover = totalCovers > 0 ? totalRevenue / totalCovers : 0;
    
    // Item sales summary
    const itemSales: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    orderItems.forEach((item: any) => {
      const name = item.lab_ops_menu_items?.name || "Unknown";
      const cat = item.lab_ops_menu_items?.lab_ops_categories?.name || "Uncategorized";
      if (!itemSales[name]) itemSales[name] = { name, qty: 0, revenue: 0, category: cat };
      itemSales[name].qty += item.qty || 0;
      itemSales[name].revenue += (item.unit_price * item.qty) || 0;
    });
    
    // Recipe costs
    const recipeCosts = recipes.map((r: any) => {
      const ingredients = r.lab_ops_recipe_ingredients || [];
      let cost = 0;
      ingredients.forEach((ing: any) => {
        const invItem = inventory.find((i: any) => i.id === ing.inventory_item_id);
        if (invItem) {
          const unitCost = invItem.unit_cost || 0;
          const bottleSize = invItem.bottle_size_ml || 700;
          const costPerMl = bottleSize > 0 ? unitCost / bottleSize : 0;
          const qtyMl = (ing.qty || 0) * (ing.unit === 'ml' ? 1 : ing.unit === 'cl' ? 10 : 1);
          cost += qtyMl * costPerMl;
        }
      });
      const price = r.menu_item?.base_price || 0;
      const profit = price - cost;
      const margin = price > 0 ? (profit / price) * 100 : 0;
      return {
        name: r.menu_item?.name || "Unknown",
        cost,
        price,
        profit,
        margin
      };
    });
    
    const topSellers = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const worstSellers = Object.values(itemSales).sort((a, b) => a.revenue - b.revenue).slice(0, 5);
    const avgCost = recipeCosts.length > 0 ? recipeCosts.reduce((s: number, r: any) => s + r.cost, 0) / recipeCosts.length : 0;
    const avgProfit = recipeCosts.length > 0 ? recipeCosts.reduce((s: number, r: any) => s + r.profit, 0) / recipeCosts.length : 0;
    const avgMargin = recipeCosts.length > 0 ? recipeCosts.reduce((s: number, r: any) => s + r.margin, 0) / recipeCosts.length : 0;

    return `
ANALYTICS DATA SUMMARY:
=======================
Period: Last 500 orders

KEY METRICS:
- Total Revenue: ${totalRevenue.toFixed(2)}
- Total Orders: ${totalOrders}
- Average Order Value: ${avgOrderValue.toFixed(2)}
- Total Covers: ${totalCovers}
- Average Per Cover: ${avgPerCover.toFixed(2)}

ITEM PERFORMANCE (Top 10):
${topSellers.map((i, idx) => `${idx + 1}. ${i.name}: ${i.qty} sold, Revenue: ${i.revenue.toFixed(2)}, Category: ${i.category}`).join('\n')}

UNDERPERFORMERS (Bottom 5):
${worstSellers.map((i, idx) => `${idx + 1}. ${i.name}: ${i.qty} sold, Revenue: ${i.revenue.toFixed(2)}`).join('\n')}

RECIPE COST ANALYSIS:
- Average Cost Per Item: ${avgCost.toFixed(2)}
- Average Profit Per Item: ${avgProfit.toFixed(2)}
- Average Margin: ${avgMargin.toFixed(1)}%

DETAILED RECIPE COSTS:
${recipeCosts.slice(0, 15).map(r => `- ${r.name}: Cost ${r.cost.toFixed(2)}, Price ${r.price.toFixed(2)}, Profit ${r.profit.toFixed(2)} (${r.margin.toFixed(1)}%)`).join('\n')}

MENU ITEMS: ${menuItems.length} total items
INVENTORY ITEMS: ${inventory.length} items tracked
`;
  };

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;
    
    const userMessage: Message = { role: 'user', content: prompt };
    const loadingMessage: Message = { role: 'assistant', content: '', loading: true };
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Fetch analytics data
      const data = await fetchAnalyticsData();
      const context = buildAnalyticsContext(data);
      
      const systemPrompt = `You are an expert F&B analytics assistant for a restaurant/bar. You analyze sales, costs, and profitability data.

IMPORTANT INSTRUCTIONS:
1. Be concise and actionable
2. Use numbers and percentages
3. Highlight key insights
4. Suggest improvements when relevant
5. Format responses clearly with bullet points
6. When asked about profits/margins, calculate and show the numbers
7. When comparing items, rank them clearly

Current Analytics Data:
${context}

Answer the user's question based on this data. Be specific with numbers.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analytics-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: prompt }
          ]
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        throw new Error("Failed to get AI response");
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (!line.startsWith("data: ") || line.trim() === "") continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.loading || updated[lastIdx]?.role === 'assistant') {
                  updated[lastIdx] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            // Partial JSON, continue
          }
        }
      }

      if (!assistantContent) {
        throw new Error("No response received");
      }

    } catch (error: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          role: 'assistant', 
          content: `Error: ${error.message}. Please try again.` 
        };
        return updated;
      });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-amber-500" />
          AI Analytics Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask questions about your data - average costs, profits, trends & more
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((qp, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => sendMessage(qp.prompt)}
              disabled={isLoading}
            >
              {qp.label}
            </Button>
          ))}
        </div>

        {/* Chat area */}
        <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-3" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Ask me anything about your analytics</p>
              <p className="text-xs mt-1">Try: "What's my average profit per item?"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing data...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask about profits, costs, trends..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Clear button */}
        {messages.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => setMessages([])}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Clear conversation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
