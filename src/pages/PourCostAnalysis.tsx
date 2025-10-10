import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DrinkAnalysis {
  name: string;
  sellingPrice: number;
  costOfGoods: number;
  pourCost: number;
  status: 'good' | 'warning' | 'poor';
}

const PourCostAnalysis = () => {
  const navigate = useNavigate();
  const [drinks, setDrinks] = useState<DrinkAnalysis[]>([]);
  const [drinkName, setDrinkName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costOfGoods, setCostOfGoods] = useState("");

  const calculatePourCost = (cost: number, price: number) => {
    return (cost / price) * 100;
  };

  const getStatus = (pourCost: number): 'good' | 'warning' | 'poor' => {
    if (pourCost <= 20) return 'good';
    if (pourCost <= 30) return 'warning';
    return 'poor';
  };

  const handleAddDrink = () => {
    if (!drinkName || !sellingPrice || !costOfGoods) {
      toast.error("Please fill in all fields");
      return;
    }

    const price = parseFloat(sellingPrice);
    const cost = parseFloat(costOfGoods);

    if (cost > price) {
      toast.error("Cost cannot be greater than selling price");
      return;
    }

    const pourCost = calculatePourCost(cost, price);
    const status = getStatus(pourCost);

    setDrinks([...drinks, {
      name: drinkName,
      sellingPrice: price,
      costOfGoods: cost,
      pourCost,
      status
    }]);

    setDrinkName("");
    setSellingPrice("");
    setCostOfGoods("");
    toast.success("Drink added to analysis");
  };

  const averagePourCost = drinks.length > 0
    ? drinks.reduce((sum, drink) => sum + drink.pourCost, 0) / drinks.length
    : 0;

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
              Pour Cost Analysis
            </h1>
            <p className="text-muted-foreground">
              Monitor profitability and control costs
            </p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Add Drink for Analysis</CardTitle>
            <CardDescription>Enter drink details to calculate pour cost percentage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Drink Name</label>
              <Input
                placeholder="e.g., Margarita"
                value={drinkName}
                onChange={(e) => setDrinkName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selling Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="12.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cost of Goods ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2.50"
                  value={costOfGoods}
                  onChange={(e) => setCostOfGoods(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddDrink} className="w-full">
              Add to Analysis
            </Button>
          </CardContent>
        </Card>

        {drinks.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Overall Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Average Pour Cost</span>
                  <span className={`text-2xl font-bold ${
                    averagePourCost <= 20 ? 'text-green-500' :
                    averagePourCost <= 30 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {averagePourCost.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Industry standard: 18-24% | Target: Under 25%
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Drink Analysis</h3>
              {drinks.map((drink, index) => (
                <Card key={index} className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{drink.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${drink.sellingPrice.toFixed(2)} | Cost: ${drink.costOfGoods.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          drink.status === 'good' ? 'text-green-500' :
                          drink.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {drink.pourCost.toFixed(1)}%
                        </div>
                        {drink.status === 'good' && (
                          <div className="flex items-center gap-1 text-green-500 text-xs">
                            <TrendingUp className="w-3 h-3" />
                            <span>Excellent</span>
                          </div>
                        )}
                        {drink.status === 'warning' && (
                          <div className="flex items-center gap-1 text-yellow-500 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Review</span>
                          </div>
                        )}
                        {drink.status === 'poor' && (
                          <div className="flex items-center gap-1 text-red-500 text-xs">
                            <TrendingDown className="w-3 h-3" />
                            <span>Action Needed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          drink.status === 'good' ? 'bg-green-500' :
                          drink.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(drink.pourCost, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Profit Margin: ${(drink.sellingPrice - drink.costOfGoods).toFixed(2)} ({((1 - (drink.pourCost / 100)) * 100).toFixed(1)}%)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PourCostAnalysis;