import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Sparkles, BarChart3, Download, FileText, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";

interface AIAnalyticsInquiryProps {
  outletId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  reportTitle?: string;
}

// 20 Ready-made analytics inquiries
const READY_INQUIRIES = [
  { id: "avg-profit", label: "Average Profit Per Item", prompt: "Calculate and show the average profit per menu item with a breakdown by category" },
  { id: "avg-cost", label: "Average Cost Per Item", prompt: "What is the average cost per menu item? List the top 10 most expensive items to make" },
  { id: "top-sellers", label: "Top 10 Best Sellers", prompt: "Show me the top 10 best selling items ranked by quantity sold and revenue" },
  { id: "worst-sellers", label: "Bottom 5 Worst Sellers", prompt: "Which 5 items are selling the least? Show quantity and revenue" },
  { id: "best-margins", label: "Best Profit Margins", prompt: "Which items have the highest profit margin percentage? Rank top 10" },
  { id: "worst-margins", label: "Worst Profit Margins", prompt: "Which items have the lowest profit margin? These need price review" },
  { id: "avg-order", label: "Average Order Value", prompt: "What is the average order value? Compare to last period if data available" },
  { id: "avg-cover", label: "Average Per Cover", prompt: "Calculate average revenue per cover/guest" },
  { id: "category-mix", label: "Category Sales Mix", prompt: "Show sales breakdown by category with percentages and revenue" },
  { id: "peak-hours", label: "Peak Sales Hours", prompt: "Analyze order patterns to identify peak sales hours" },
  { id: "daily-revenue", label: "Daily Revenue Trend", prompt: "Show daily revenue trend for the past 7 days" },
  { id: "food-cost-pct", label: "Food Cost Percentage", prompt: "Calculate overall food/beverage cost percentage across all items" },
  { id: "high-cost-items", label: "High Cost Items", prompt: "Which items have cost percentage above 35%? These need attention" },
  { id: "inventory-value", label: "Inventory Value", prompt: "What is the total value of current inventory?" },
  { id: "low-stock-alert", label: "Low Stock Items", prompt: "Which items are running low on stock?" },
  { id: "revenue-by-day", label: "Revenue by Day of Week", prompt: "Compare revenue across different days of the week" },
  { id: "staff-performance", label: "Staff Sales Performance", prompt: "Show sales performance by staff member if available" },
  { id: "recipe-efficiency", label: "Recipe Cost Efficiency", prompt: "Analyze recipe costs and identify opportunities to reduce costs" },
  { id: "price-recommendations", label: "Price Recommendations", prompt: "Based on costs and margins, which items need price adjustments?" },
  { id: "overall-summary", label: "Complete Business Summary", prompt: "Provide a comprehensive summary of overall business performance including revenue, costs, profits, top sellers, and recommendations" },
];

export default function AIAnalyticsInquiry({ outletId }: AIAnalyticsInquiryProps) {
  const { formatPrice } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<string>("");
  const [currentReport, setCurrentReport] = useState<{ title: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAnalyticsData = async () => {
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
    
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalCovers = orders.reduce((sum: number, o: any) => sum + (o.covers || 1), 0);
    const avgPerCover = totalCovers > 0 ? totalRevenue / totalCovers : 0;
    
    const itemSales: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    orderItems.forEach((item: any) => {
      const name = item.lab_ops_menu_items?.name || "Unknown";
      const cat = "Category";
      if (!itemSales[name]) itemSales[name] = { name, qty: 0, revenue: 0, category: cat };
      itemSales[name].qty += item.qty || 0;
      itemSales[name].revenue += (item.unit_price * item.qty) || 0;
    });
    
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
      const menuItem = menuItems.find((m: any) => m.id === r.menu_item_id);
      const price = menuItem?.base_price || 0;
      const profit = price - cost;
      const margin = price > 0 ? (profit / price) * 100 : 0;
      return { name: menuItem?.name || "Unknown", cost, price, profit, margin };
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
${topSellers.map((i, idx) => `${idx + 1}. ${i.name}: ${i.qty} sold, Revenue: ${i.revenue.toFixed(2)}`).join('\n')}

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

  const sendMessage = async (prompt: string, reportTitle?: string) => {
    if (!prompt.trim() || isLoading) return;
    
    const userMessage: Message = { role: 'user', content: prompt };
    const loadingMessage: Message = { role: 'assistant', content: '', loading: true };
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await fetchAnalyticsData();
      const context = buildAnalyticsContext(data);
      
      const systemPrompt = `You are an expert F&B analytics assistant. Analyze data and provide actionable insights.

INSTRUCTIONS:
1. Be concise and use numbers/percentages
2. Format with clear sections and bullet points
3. Highlight key insights and recommendations
4. Include specific values from the data

Current Analytics Data:
${context}

Provide a detailed analysis for the user's request.`;

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
        if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
        throw new Error("Failed to get AI response");
      }

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
                  updated[lastIdx] = { role: 'assistant', content: assistantContent, reportTitle };
                }
                return updated;
              });
            }
          } catch {
            // Partial JSON
          }
        }
      }

      if (assistantContent && reportTitle) {
        setCurrentReport({ title: reportTitle, content: assistantContent });
      }

      if (!assistantContent) throw new Error("No response received");

    } catch (error: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${error.message}` };
        return updated;
      });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInquirySelect = (inquiryId: string) => {
    const inquiry = READY_INQUIRIES.find(i => i.id === inquiryId);
    if (inquiry) {
      setSelectedInquiry(inquiryId);
      sendMessage(inquiry.prompt, inquiry.label);
    }
  };

  const downloadReport = (title: string, content: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${title.replace(/\s+/g, '_')}_${timestamp}.txt`;
    const blob = new Blob([`${title}\n${'='.repeat(title.length)}\nGenerated: ${new Date().toLocaleString()}\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `Report saved as ${filename}` });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-amber-500" />
          AI Analytics Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a ready report or ask custom questions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ready Inquiries Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ready Reports (20 Available)</label>
          <Select value={selectedInquiry} onValueChange={handleInquirySelect} disabled={isLoading}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue placeholder="Select a ready-made report..." />
            </SelectTrigger>
            <SelectContent className="bg-card z-50 max-h-[300px]">
              {READY_INQUIRIES.map((inquiry) => (
                <SelectItem key={inquiry.id} value={inquiry.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    {inquiry.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat area */}
        <ScrollArea className="h-[350px] rounded-lg border bg-muted/30 p-3" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Select a ready report above or ask a custom question</p>
              <p className="text-xs mt-1">20 ready-made analytics reports available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating report...</span>
                      </div>
                    ) : (
                      <div>
                        {msg.reportTitle && msg.role === 'assistant' && (
                          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b">
                            <Badge variant="secondary" className="text-xs">{msg.reportTitle}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => downloadReport(msg.reportTitle!, msg.content)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Custom Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask a custom question..."
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

        {/* Actions */}
        {messages.length > 0 && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => {
                const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.loading);
                if (lastAssistant) {
                  downloadReport(lastAssistant.reportTitle || 'Analytics_Report', lastAssistant.content);
                }
              }}
              disabled={!messages.some(m => m.role === 'assistant' && !m.loading)}
            >
              <Download className="h-3 w-3 mr-1" />
              Download Last Report
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                setMessages([]);
                setSelectedInquiry("");
                setCurrentReport(null);
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
