import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Star, TrendingUp, DollarSign, Zap } from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  profitMargin: number;
  popularity: number;
  category: 'star' | 'plow' | 'puzzle' | 'dog';
}

const MenuEngineering = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [unitsSold, setUnitsSold] = useState("");

  const categorizeItem = (profit: number, popularity: number, avgProfit: number, avgPopularity: number): 'star' | 'plow' | 'puzzle' | 'dog' => {
    if (profit >= avgProfit && popularity >= avgPopularity) return 'star';
    if (profit < avgProfit && popularity >= avgPopularity) return 'plow';
    if (profit >= avgProfit && popularity < avgPopularity) return 'puzzle';
    return 'dog';
  };

  const handleAddItem = () => {
    if (!itemName || !profitMargin || !unitsSold) {
      toast.error("Please fill in all fields");
      return;
    }

    const profit = parseFloat(profitMargin);
    const sold = parseFloat(unitsSold);

    const avgProfit = items.length > 0 
      ? items.reduce((sum, item) => sum + item.profitMargin, 0) / items.length 
      : profit;
    const avgPopularity = items.length > 0 
      ? items.reduce((sum, item) => sum + item.popularity, 0) / items.length 
      : sold;

    const newItems = [...items, {
      id: Date.now().toString(),
      name: itemName,
      profitMargin: profit,
      popularity: sold,
      category: categorizeItem(profit, sold, avgProfit, avgPopularity)
    }];

    // Re-categorize all items with new averages
    const newAvgProfit = newItems.reduce((sum, item) => sum + item.profitMargin, 0) / newItems.length;
    const newAvgPopularity = newItems.reduce((sum, item) => sum + item.popularity, 0) / newItems.length;

    const recategorizedItems = newItems.map(item => ({
      ...item,
      category: categorizeItem(item.profitMargin, item.popularity, newAvgProfit, newAvgPopularity)
    }));

    setItems(recategorizedItems);
    setItemName("");
    setProfitMargin("");
    setUnitsSold("");
    toast.success("Item added to analysis");
  };

  const categories = {
    star: items.filter(item => item.category === 'star'),
    plow: items.filter(item => item.category === 'plow'),
    puzzle: items.filter(item => item.category === 'puzzle'),
    dog: items.filter(item => item.category === 'dog')
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'star':
        return {
          title: 'Stars',
          icon: Star,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          description: 'High profit, high popularity - Keep these!',
          action: 'Maintain quality and promote heavily'
        };
      case 'plow':
        return {
          title: 'Plowhorses',
          icon: TrendingUp,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          description: 'Low profit, high popularity',
          action: 'Increase prices or reduce costs'
        };
      case 'puzzle':
        return {
          title: 'Puzzles',
          icon: DollarSign,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
          description: 'High profit, low popularity',
          action: 'Reposition, rename, or bundle'
        };
      case 'dog':
        return {
          title: 'Dogs',
          icon: Zap,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          description: 'Low profit, low popularity',
          action: 'Consider removing from menu'
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">
              Menu Engineering
            </h1>
            <p className="text-muted-foreground">
              Optimize menu profitability & performance
            </p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Add Menu Item</CardTitle>
            <CardDescription>Analyze profitability and popularity patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Name</label>
              <Input
                placeholder="e.g., Classic Mojito"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Profit Margin ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="8.50"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Units Sold (Month)</label>
                <Input
                  type="number"
                  placeholder="150"
                  value={unitsSold}
                  onChange={(e) => setUnitsSold(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddItem} className="w-full">
              Add Item
            </Button>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Menu Matrix Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Object.entries(categories).map(([key, categoryItems]) => {
                  const info = getCategoryInfo(key);
                  if (!info) return null;
                  const Icon = info.icon;
                  return (
                    <div key={key} className={`p-4 rounded-lg ${info.bgColor} border ${info.borderColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${info.color}`} />
                        <span className="font-semibold text-sm">{info.title}</span>
                      </div>
                      <div className={`text-2xl font-bold ${info.color}`}>
                        {categoryItems.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {categoryItems.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {Object.entries(categories).map(([key, categoryItems]) => {
              if (categoryItems.length === 0) return null;
              const info = getCategoryInfo(key);
              if (!info) return null;
              const Icon = info.icon;

              return (
                <Card key={key} className="glass">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${info.color}`} />
                      <CardTitle>{info.title}</CardTitle>
                    </div>
                    <CardDescription>{info.description}</CardDescription>
                    <div className={`text-sm font-medium mt-2 ${info.color}`}>
                      → {info.action}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg ${info.bgColor} border ${info.borderColor}`}
                      >
                        <h4 className="font-semibold mb-2">{item.name}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Profit Margin:</span>
                            <div className="font-medium">${item.profitMargin.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Units Sold:</span>
                            <div className="font-medium">{item.popularity}</div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">Monthly Revenue:</span>
                          <div className={`font-bold ${info.color}`}>
                            ${(item.profitMargin * item.popularity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MenuEngineering;